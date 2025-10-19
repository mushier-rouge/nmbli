import { redirect } from 'next/navigation';

import { getSessionContext } from '@/lib/auth/session';
import { hasInviteAccess, shouldRequireInviteCode } from '@/lib/invite/config';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSessionContext();

  if (!session) {
    redirect('/login');
  }

  if (shouldRequireInviteCode() && session.role === 'buyer' && !hasInviteAccess(session.metadata)) {
    redirect('/invite-code');
  }

  if (session.role === 'ops') {
    redirect('/ops');
  }

  if (session.role === 'dealer') {
    redirect('/dealer');
  }

  redirect('/briefs');
}
