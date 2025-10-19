import type { Prisma, TimelineActor, TimelineEventType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

interface RecordTimelineEventParams {
  briefId: string;
  type: TimelineEventType;
  actor: TimelineActor;
  payload?: Prisma.InputJsonValue;
  quoteId?: string | null;
}

export async function recordTimelineEvent(params: RecordTimelineEventParams) {
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
