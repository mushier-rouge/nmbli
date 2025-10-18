import { redirect } from 'next/navigation';

import { InviteCodeForm } from '@/components/auth/invite-code-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionContext } from '@/lib/auth/session';
import { hasInviteAccess, shouldRequireInviteCode } from '@/lib/invite/config';

interface InviteCodePageProps {
  searchParams?: { next?: string };
}

export default async function InviteCodePage({ searchParams }: InviteCodePageProps) {
  const session = await getSessionContext();
  const requireInvite = shouldRequireInviteCode();
  const nextPath = searchParams?.next ?? null;

  if (!session) {
    const redirectTo = nextPath && nextPath.startsWith('/') ? nextPath : '/invite-code';
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const inviteSatisfied = hasInviteAccess(session.metadata);
  const shouldBypass = !requireInvite || session.role !== 'buyer' || inviteSatisfied;

  if (shouldBypass) {
    redirect(nextPath && nextPath.startsWith('/') ? nextPath : '/briefs');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter your invite code</CardTitle>
          <CardDescription>
            We&apos;re onboarding a small group during development. Share the invite code the ops team sent to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteCodeForm nextPath={nextPath} />
        </CardContent>
      </Card>
    </main>
  );
}
