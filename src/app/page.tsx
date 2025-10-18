import { redirect } from 'next/navigation';

import { getSessionContext } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSessionContext();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ops') {
    redirect('/ops');
  }

  if (session.role === 'dealer') {
    redirect('/dealer');
  }

  redirect('/briefs');
}
