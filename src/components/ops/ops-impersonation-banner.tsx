import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/lib/auth/session';

import { OpsImpersonationToggle } from './ops-impersonation-toggle';

export async function OpsImpersonationBanner() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const session = await getSessionContext();
  if (!session || session.role !== 'ops') {
    return null;
  }

  const dealers = await prisma.dealer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
    },
  });

  if (dealers.length === 0) {
    return null;
  }

  return <OpsImpersonationToggle dealers={dealers} activeDealerId={session.impersonatedDealerId ?? null} />;
}
