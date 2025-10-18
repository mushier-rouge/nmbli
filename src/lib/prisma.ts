import { PrismaClient, Prisma } from '../generated/prisma';

export const TimelineEventType = {
  brief_created: 'brief_created',
  dealer_invited: 'dealer_invited',
  invite_viewed: 'invite_viewed',
  quote_submitted: 'quote_submitted',
  quote_revised: 'quote_revised',
  quote_published: 'quote_published',
  quote_accepted: 'quote_accepted',
  quote_rejected: 'quote_rejected',
  counter_sent: 'counter_sent',
  counter_accepted: 'counter_accepted',
  contract_uploaded: 'contract_uploaded',
  contract_checked: 'contract_checked',
  contract_mismatch: 'contract_mismatch',
  contract_pass: 'contract_pass',
  completed: 'completed',
} as const;

export const TimelineActor = {
  buyer: 'buyer',
  dealer: 'dealer',
  ops: 'ops',
  system: 'system',
} as const;

if (!(Prisma as any).TimelineEventType) {
  (Prisma as any).TimelineEventType = TimelineEventType;
}
if (!(Prisma as any).TimelineActor) {
  (Prisma as any).TimelineActor = TimelineActor;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
