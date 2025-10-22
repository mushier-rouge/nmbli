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

type PrismaEnumRegistry = typeof Prisma & {
  TimelineEventType?: typeof TimelineEventType;
  TimelineActor?: typeof TimelineActor;
};

const prismaEnumRegistry = Prisma as PrismaEnumRegistry;

if (!prismaEnumRegistry.TimelineEventType) {
  prismaEnumRegistry.TimelineEventType = TimelineEventType;
}
if (!prismaEnumRegistry.TimelineActor) {
  prismaEnumRegistry.TimelineActor = TimelineActor;
}

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_POOL_URL or DATABASE_URL environment variable for Prisma client');
  }

  return databaseUrl;
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['info', 'warn', 'error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
