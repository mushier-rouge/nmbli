import { randomUUID } from 'crypto';

import {
  BriefStatus,
  DealerInviteState,
  FileOwnerType,
  QuoteLineKind,
  QuoteSource,
  QuoteStatus,
} from '@/generated/prisma';
import type {
  Prisma,
  TimelineActor as TimelineActorType,
  TimelineEventType as TimelineEventTypeType,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { toDecimal, toNullableDecimal } from '@/lib/utils/prisma-helpers';
import type { DealerQuoteInput, CounterRequest } from '@/lib/validation/quote';
import { recordTimelineEvent } from './timeline';
import { uploadBufferToStorage, uploadFileToStorage } from './storage';

function clampScore(score: number) {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

export function calculateShadinessScore(input: DealerQuoteInput, isContractMatchedFirstTry = false) {
  let score = 0;
  const hasItemization =
    (input.incentives?.length ?? 0) +
      (input.addons?.length ?? 0) +
      (input.otherFees?.length ?? 0) > 0 ||
    (input.docFee ?? 0) > 0 ||
    (input.dmvFee ?? 0) > 0 ||
    (input.tireBatteryFee ?? 0) > 0;

  if (!hasItemization && input.otdTotal > 0) {
    score += 10;
  }

  const hasForcedAddons = input.addons?.some((addon) => addon.isOptional === false && addon.amount > 0) ?? false;
  if (hasForcedAddons) {
    score += 15;
  }

  if (input.requiresCreditPullForCash) {
    score += 10;
  }

  if (input.honorsAdvertisedVinPrice) {
    score -= 10;
  }

  if (isContractMatchedFirstTry) {
    score -= 15;
  }

  return clampScore(score);
}

export async function submitDealerQuote(params: {
  inviteId: string;
  dealerId: string;
  briefId: string;
  input: DealerQuoteInput;
  files: File[];
}) {
  const { inviteId, dealerId, briefId, input, files } = params;

  const incentivesTotal = input.incentives?.reduce((sum, incentive) => sum + incentive.amount, 0) ?? 0;
  const addonsTotal = input.addons?.reduce((sum, addon) => sum + addon.amount, 0) ?? 0;
  const otherFeesTotal = input.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) ?? 0;

  const shadinessScore = calculateShadinessScore(input);

  const result = await prisma.$transaction(async (tx) => {
    const previousQuote = await tx.quote.findFirst({
      where: {
        inviteId,
        status: {
          in: [QuoteStatus.published, QuoteStatus.accepted],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quote = await tx.quote.create({
      data: {
        briefId,
        dealerId,
        inviteId,
        status: QuoteStatus.published,
        vin: input.vin,
        stockNumber: input.stockNumber,
        year: input.year,
        make: input.make,
        model: input.model,
        trim: input.trim,
        extColor: input.extColor,
        intColor: input.intColor,
        etaDate: input.etaDate ? new Date(input.etaDate) : null,
        msrp: toDecimal(input.msrp),
        dealerDiscount: toDecimal(input.dealerDiscount),
        docFee: toDecimal(input.docFee ?? 0),
        dmvFee: toDecimal(input.dmvFee ?? 0),
        tireBatteryFee: toDecimal(input.tireBatteryFee ?? 0),
        otherFeesTotal: toDecimal(otherFeesTotal),
        incentivesTotal: toDecimal(incentivesTotal),
        addonsTotal: toDecimal(addonsTotal),
        taxRate: toDecimal(input.taxRate),
        taxAmount: toDecimal(input.taxAmount),
        otdTotal: toDecimal(input.otdTotal),
        paymentType: input.payment?.type,
        aprOrMf: toNullableDecimal(input.payment?.aprOrMf ?? null),
        termMonths: input.payment?.termMonths ?? null,
        dasAmount: toNullableDecimal(input.payment?.dasAmount ?? null),
        evidenceNote: input.evidenceNote,
        paymentSnapshot: input.payment ? { ...input.payment } : undefined,
        confirmations: input.confirmations,
        metadata: {
          requiresCreditPullForCash: input.requiresCreditPullForCash ?? false,
          honorsAdvertisedVinPrice: input.honorsAdvertisedVinPrice ?? false,
        },
        shadinessScore,
        parentQuoteId: previousQuote?.id ?? null,
      },
    });

    const lineCreates: Prisma.QuoteLineCreateManyInput[] = [];

    for (const incentive of input.incentives ?? []) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.incentive,
        name: incentive.name,
        amount: toDecimal(incentive.amount),
      });
    }

    for (const fee of input.otherFees ?? []) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.fee,
        name: fee.name,
        amount: toDecimal(fee.amount),
      });
    }

    if (input.docFee && input.docFee > 0) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.fee,
        name: 'Doc Fee',
        amount: toDecimal(input.docFee),
      });
    }

    if (input.dmvFee && input.dmvFee > 0) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.fee,
        name: 'DMV / Registration',
        amount: toDecimal(input.dmvFee),
      });
    }

    if (input.tireBatteryFee && input.tireBatteryFee > 0) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.fee,
        name: 'Tire & Battery',
        amount: toDecimal(input.tireBatteryFee),
      });
    }

    for (const addon of input.addons ?? []) {
      lineCreates.push({
        id: randomUUID(),
        quoteId: quote.id,
        kind: QuoteLineKind.addon,
        name: addon.name,
        amount: toDecimal(addon.amount),
        approvedByBuyer: addon.isOptional,
      });
    }

    if (lineCreates.length > 0) {
      await tx.quoteLine.createMany({ data: lineCreates });
    }

    if (files.length > 0) {
      for (const file of files) {
        const upload = await uploadFileToStorage({
          file,
          pathPrefix: `quotes/${quote.id}`,
        });

        await tx.fileAsset.create({
          data: {
            ownerType: FileOwnerType.quote,
            ownerId: quote.id,
            url: upload.url,
            mimeType: upload.mimeType,
            originalName: upload.originalName,
            size: upload.size,
            quoteId: quote.id,
          },
        });
      }
    }

    if (previousQuote) {
      await tx.quote.update({
        where: { id: previousQuote.id },
        data: { status: QuoteStatus.superseded },
      });
      await tx.dealerInvite.update({
        where: { id: inviteId },
        data: { state: DealerInviteState.revised },
      });
    } else {
      await tx.dealerInvite.update({
        where: { id: inviteId },
        data: { state: DealerInviteState.submitted },
      });
    }

    return quote;
  });

  const uploads: { url: string; mimeType: string; originalName: string; size: number }[] = [];

  if (files.length > 0) {
    for (const file of files) {
      const upload = await uploadFileToStorage({ file, pathPrefix: `quotes/${result.id}` });
      uploads.push(upload);
    }

    await prisma.fileAsset.createMany({
      data: uploads.map((upload) => ({
        id: randomUUID(),
        ownerType: FileOwnerType.quote,
        ownerId: result.id,
        url: upload.url,
        mimeType: upload.mimeType,
        originalName: upload.originalName,
        size: upload.size,
        quoteId: result.id,
      })),
    });
  }

  await recordTimelineEvent({
    briefId,
    quoteId: result.id,
    type: 'quote_submitted' as TimelineEventTypeType,
    actor: 'dealer' as TimelineActorType,
    payload: {
      dealerId,
      inviteId,
      shadinessScore,
    },
  });

  return result;
}

export async function sendCounter(params: {
  quoteId: string;
  actor: 'buyer' | 'ops';
  request: CounterRequest;
}) {
  const { quoteId, actor, request } = params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      dealer: true,
      brief: {
        include: {
          buyer: true,
        },
      },
      invite: true,
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  await recordTimelineEvent({
    briefId: quote.briefId,
    quoteId: quote.id,
    type: 'counter_sent' as TimelineEventTypeType,
    actor: (actor === 'ops' ? 'ops' : 'buyer') as TimelineActorType,
    payload: request,
  });

  return quote;
}

export async function acceptQuote(params: { quoteId: string; buyerId: string }) {
  const { quoteId, buyerId } = params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      brief: true,
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  if (quote.brief.buyerId !== buyerId) {
    throw new Error('Cannot accept quote for another buyer');
  }

  if (quote.status === QuoteStatus.accepted) {
    return quote;
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.quote.updateMany({
      where: { briefId: quote.briefId, status: QuoteStatus.accepted },
      data: { status: QuoteStatus.rejected },
    });

    const accepted = await tx.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.accepted },
    });

    await tx.brief.update({
      where: { id: quote.briefId },
      data: { status: BriefStatus.contract },
    });

    return accepted;
  });

  await recordTimelineEvent({
    briefId: quote.briefId,
    quoteId: quote.id,
    type: 'quote_accepted' as TimelineEventTypeType,
    actor: 'buyer' as TimelineActorType,
    payload: {
      otdTotal: quote.otdTotal?.toString(),
    },
  });

  return result;
}

export async function ingestEmailQuote(params: {
  briefId: string;
  dealerEmail: string;
  subject: string;
  body: string;
  attachments: Array<{ fileName: string; mimeType: string; content: string }>;
}) {
  const { briefId, dealerEmail, subject, body, attachments } = params;

  let dealer = await prisma.dealer.findFirst({ where: { contactEmail: dealerEmail } });
  if (!dealer) {
    dealer = await prisma.dealer.create({
      data: {
        name: dealerEmail.split('@')[0] ?? 'Dealer',
        city: 'Unknown',
        state: 'NA',
        contactName: dealerEmail,
        contactEmail: dealerEmail,
        phone: 'N/A',
      },
    });
  }

  const quote = await prisma.quote.create({
    data: {
      briefId,
      dealerId: dealer.id,
      status: QuoteStatus.draft,
      source: QuoteSource.email_parsed,
      evidenceNote: `${subject}

${body}`.slice(0, 1000),
      confidence: toDecimal(0.3),
    },
  });

  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (attachment) => {
        const buffer = Buffer.from(attachment.content, 'base64');
        const upload = await uploadBufferToStorage({
          buffer,
          pathPrefix: `quotes/${quote.id}/email`,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        });
        await prisma.fileAsset.create({
          data: {
            ownerType: FileOwnerType.quote,
            ownerId: quote.id,
            url: upload.url,
            mimeType: upload.mimeType,
            originalName: upload.originalName,
            size: upload.size,
            quoteId: quote.id,
          },
        });
      })
    );
  }

  await recordTimelineEvent({
    briefId,
    quoteId: quote.id,
    type: 'quote_submitted' as TimelineEventTypeType,
    actor: 'ops' as TimelineActorType,
    payload: { source: 'email_ingest', dealerEmail },
  });

  return quote;
}

export async function publishDraftQuote(params: { quoteId: string; confidence?: number; note?: string }) {
  const { quoteId, confidence, note } = params;
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    throw new Error('Quote not found');
  }
  if (quote.status !== QuoteStatus.draft) {
    return quote;
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.published,
      confidence: confidence !== undefined ? toDecimal(confidence) : quote.confidence,
      evidenceNote: note ?? quote.evidenceNote,
    },
  });

  await recordTimelineEvent({
    briefId: updated.briefId,
    quoteId: updated.id,
    type: 'quote_published' as TimelineEventTypeType,
    actor: 'ops' as TimelineActorType,
    payload: { confidence },
  });

  return updated;
}
