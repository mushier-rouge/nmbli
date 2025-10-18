import { randomUUID } from 'crypto';

import { Prisma } from '@/generated/prisma';
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

  const incentivesTotal = input.incentives?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const addonsTotal = input.addons?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const otherFeesTotal = input.otherFees?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const shadinessScore = calculateShadinessScore(input);

  const quote = await prisma.$transaction(async (tx) => {
    const previousQuote = await tx.quote.findFirst({
      where: {
        inviteId,
        status: { in: [Prisma.QuoteStatus.published, Prisma.QuoteStatus.accepted] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const created = await tx.quote.create({
      data: {
        briefId,
        dealerId,
        inviteId,
        status: Prisma.QuoteStatus.published,
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

    const lineData: Prisma.QuoteLineCreateManyInput[] = [];

    for (const incentive of input.incentives ?? []) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.incentive,
        name: incentive.name,
        amount: toDecimal(incentive.amount),
      });
    }

    for (const fee of input.otherFees ?? []) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.fee,
        name: fee.name,
        amount: toDecimal(fee.amount),
      });
    }

    if (input.docFee && input.docFee > 0) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.fee,
        name: 'Doc Fee',
        amount: toDecimal(input.docFee),
      });
    }

    if (input.dmvFee && input.dmvFee > 0) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.fee,
        name: 'DMV / Registration',
        amount: toDecimal(input.dmvFee),
      });
    }

    if (input.tireBatteryFee && input.tireBatteryFee > 0) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.fee,
        name: 'Tire & Battery',
        amount: toDecimal(input.tireBatteryFee),
      });
    }

    for (const addon of input.addons ?? []) {
      lineData.push({
        id: randomUUID(),
        quoteId: created.id,
        kind: Prisma.QuoteLineKind.addon,
        name: addon.name,
        amount: toDecimal(addon.amount),
        approvedByBuyer: addon.isOptional,
      });
    }

    if (lineData.length > 0) {
      await tx.quoteLine.createMany({ data: lineData });
    }

    if (previousQuote) {
      await tx.quote.update({
        where: { id: previousQuote.id },
        data: { status: Prisma.QuoteStatus.superseded },
      });
      await tx.dealerInvite.update({
        where: { id: inviteId },
        data: { state: Prisma.DealerInviteState.revised },
      });
    } else {
      await tx.dealerInvite.update({
        where: { id: inviteId },
        data: { state: Prisma.DealerInviteState.submitted },
      });
    }

    return created;
  });

  if (files.length > 0) {
    const uploads = await Promise.all(
      files.map((file) => uploadFileToStorage({ file, pathPrefix: `quotes/${quote.id}` }))
    );

    await prisma.fileAsset.createMany({
      data: uploads.map((upload) => ({
        id: randomUUID(),
        ownerType: Prisma.FileOwnerType.quote,
        ownerId: quote.id,
        url: upload.url,
        mimeType: upload.mimeType,
        originalName: upload.originalName,
        size: upload.size,
        quoteId: quote.id,
      })),
    });
  }

  await recordTimelineEvent({
    briefId,
    quoteId: quote.id,
    type: 'quote_submitted' as Prisma.TimelineEventType,
    actor: 'dealer' as Prisma.TimelineActor,
    payload: {
      dealerId,
      inviteId,
      shadinessScore,
    },
  });

  return quote;
}

export async function sendCounter(params: { quoteId: string; actor: 'buyer' | 'ops'; request: CounterRequest }) {
  const { quoteId, actor, request } = params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      invite: true,
      dealer: true,
      brief: true,
    },
  });
  if (!quote) {
    throw new Error('Quote not found');
  }

  await recordTimelineEvent({
    briefId: quote.briefId,
    quoteId: quote.id,
    type: 'counter_sent' as Prisma.TimelineEventType,
    actor: actor === 'ops' ? 'ops' as Prisma.TimelineActor : 'buyer' as Prisma.TimelineActor,
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

  if (quote.status === Prisma.QuoteStatus.accepted) {
    return quote;
  }

  const accepted = await prisma.$transaction(async (tx) => {
    await tx.quote.updateMany({
      where: { briefId: quote.briefId, status: Prisma.QuoteStatus.accepted },
      data: { status: Prisma.QuoteStatus.rejected },
    });

    const updated = await tx.quote.update({
      where: { id: quoteId },
      data: { status: Prisma.QuoteStatus.accepted },
    });

    await tx.brief.update({
      where: { id: quote.briefId },
      data: { status: Prisma.BriefStatus.contract },
    });

    return updated;
  });

  await recordTimelineEvent({
    briefId: accepted.briefId,
    quoteId: accepted.id,
    type: 'quote_accepted' as Prisma.TimelineEventType,
    actor: 'buyer' as Prisma.TimelineActor,
    payload: {
      otdTotal: accepted.otdTotal?.toString(),
    },
  });

  return accepted;
}

export async function ingestEmailQuote(params: {
  briefId: string;
  dealerEmail: string;
  subject: string;
  body: string;
  attachments: Array<{ fileName: string; mimeType: string; content: string }>;
}) {
  const { briefId, dealerEmail, subject, body, attachments } = params;

  const dealer = await prisma.dealer.upsert({
    where: { contactEmail: dealerEmail },
    update: {},
    create: {
      name: dealerEmail.split('@')[0] ?? 'Dealer',
      city: 'Unknown',
      state: 'NA',
      contactName: dealerEmail,
      contactEmail: dealerEmail,
      phone: 'N/A',
    },
  });

  const quote = await prisma.quote.create({
    data: {
      briefId,
      dealerId: dealer.id,
      status: Prisma.QuoteStatus.draft,
      source: Prisma.QuoteSource.email_parsed,
      evidenceNote: `${subject}\n\n${body}`.slice(0, 1000),
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
            ownerType: Prisma.FileOwnerType.quote,
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
    type: 'quote_submitted' as Prisma.TimelineEventType,
    actor: 'ops' as Prisma.TimelineActor,
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
  if (quote.status !== Prisma.QuoteStatus.draft) {
    return quote;
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: Prisma.QuoteStatus.published,
      confidence: confidence !== undefined ? toDecimal(confidence) : quote.confidence,
      evidenceNote: note ?? quote.evidenceNote,
    },
  });

  await recordTimelineEvent({
    briefId: updated.briefId,
    quoteId: updated.id,
    type: 'quote_published' as Prisma.TimelineEventType,
    actor: 'ops' as Prisma.TimelineActor,
    payload: { confidence },
  });

  return updated;
}
