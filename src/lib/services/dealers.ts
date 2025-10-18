import { randomUUID } from 'crypto';

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { recordTimelineEvent } from './timeline';

export async function listDealers() {
  return prisma.dealer.findMany({ orderBy: { name: 'asc' } });
}

export async function getDealerById(id: string) {
  return prisma.dealer.findUnique({ where: { id } });
}

export async function getInviteByToken(token: string) {
  return prisma.dealerInvite.findUnique({
    where: { magicLinkToken: token },
    include: {
      dealer: true,
      brief: {
        include: {
          buyer: true,
        },
      },
      quotes: {
        include: {
          lines: true,
          dealer: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function createDealerInvites(params: {
  briefId: string;
  dealerIds: string[];
  createdById: string;
  expiresAt: Date;
}) {
  const { briefId, dealerIds, createdById, expiresAt } = params;

  const timelinePayloads: { dealerId: string; inviteId: string }[] = [];

  const invites = await prisma.$transaction(async (tx) => {
    const created: Prisma.DealerInvite[] = [];

    for (const dealerId of dealerIds) {
      const existing = await tx.dealerInvite.findFirst({
        where: {
          briefId,
          dealerId,
          state: {
            in: [
              Prisma.DealerInviteState.sent,
              Prisma.DealerInviteState.viewed,
              Prisma.DealerInviteState.submitted,
              Prisma.DealerInviteState.revised,
            ],
          },
        },
      });

      if (existing) {
        created.push(existing);
        continue;
      }

      const invite = await tx.dealerInvite.create({
        data: {
          briefId,
          dealerId,
          createdById,
          magicLinkToken: randomUUID(),
          expiresAt,
          state: Prisma.DealerInviteState.sent,
        },
      });

      created.push(invite);
      timelinePayloads.push({ dealerId, inviteId: invite.id });
    }

    return created;
  });

  await Promise.all(
    timelinePayloads.map((payload) =>
      recordTimelineEvent({
        briefId,
        type: 'dealer_invited' as Prisma.TimelineEventType,
        actor: 'ops' as Prisma.TimelineActor,
        payload,
      })
    )
  );

  return invites;
}

export async function markInviteViewed(inviteId: string) {
  return prisma.dealerInvite.update({
    where: { id: inviteId },
    data: {
      state: Prisma.DealerInviteState.viewed,
      lastViewedAt: new Date(),
    },
  });
}

export async function updateInviteState(inviteId: string, state: Prisma.DealerInviteState) {
  return prisma.dealerInvite.update({
    where: { id: inviteId },
    data: { state },
  });
}
