import type { BriefStatus } from '@/generated/prisma';
import { TimelineActor as TimelineActorEnum, TimelineEventType as TimelineEventTypeEnum } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { recordTimelineEvent } from './timeline';
import { toDecimal } from '@/lib/utils/prisma-helpers';
import type { CreateBriefInput } from '@/lib/validation/brief';

function sanitizePaymentPreferences(input: CreateBriefInput) {
  const preferences = input.paymentPreferences ?? [];
  return preferences.map((pref) => ({
    ...pref,
    downPayment: pref.downPayment ?? undefined,
    monthlyBudget: pref.monthlyBudget ?? undefined,
  }));
}

export async function createBrief(params: { buyerId: string; input: CreateBriefInput }) {
  const { buyerId, input } = params;

  const paymentPreferences = sanitizePaymentPreferences(input);
  const primaryPaymentType = input.paymentType ?? paymentPreferences[0]?.type ?? 'cash';

  const brief = await prisma.brief.create({
    data: {
      buyerId,
      zipcode: input.zipcode.trim(),
      paymentType: primaryPaymentType,
      paymentPreferences,
      maxOTD: toDecimal(input.maxOTD),
      makes: input.makes,
      models: input.models,
      trims: input.trims ?? [],
      colors: input.colors ?? [],
      mustHaves: input.mustHaves ?? [],
      timelinePreference: input.timelinePreference,
    },
    include: {
      buyer: true,
    },
  });

  await recordTimelineEvent({
    briefId: brief.id,
    type: TimelineEventTypeEnum.brief_created,
    actor: TimelineActorEnum.buyer,
    payload: {
      paymentType: brief.paymentType,
      paymentPreferences,
      maxOTD: brief.maxOTD.toString(),
    },
  });

  return brief;
}

export async function getBriefDetail(briefId: string) {
  return prisma.brief.findUnique({
    where: { id: briefId },
    include: {
      buyer: true,
      invites: {
        include: {
          dealer: true,
        },
      },
      quotes: {
        include: {
          dealer: true,
          lines: true,
          contract: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      timelineEvents: {
        orderBy: { createdAt: 'desc' },
      },
      dealerProspects: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function listBuyerBriefs(buyerId: string) {
  console.log('[DEBUG][listBuyerBriefs] query start', { buyerId, timestamp: new Date().toISOString() });
  return prisma.brief.findMany({
    where: { buyerId },
    orderBy: { createdAt: 'desc' },
    include: {
      quotes: {
        take: 3,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function updateBriefStatus(briefId: string, status: BriefStatus) {
  return prisma.brief.update({
    where: { id: briefId },
    data: { status },
  });
}

export async function listLatestBriefs(limit = 50) {
  return prisma.brief.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      buyer: true,
    },
  });
}
