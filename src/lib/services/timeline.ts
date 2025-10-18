import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export async function recordTimelineEvent(params: {
  briefId: string;
  type: Prisma.TimelineEventType;
  actor: Prisma.TimelineActor;
  payload?: Prisma.InputJsonValue;
  quoteId?: string | null;
}) {
  const { briefId, type, actor, payload = {}, quoteId = null } = params;

  return prisma.timelineEvent.create({
    data: {
      briefId,
      quoteId,
      type,
      actor,
      payload,
    },
  });
}
