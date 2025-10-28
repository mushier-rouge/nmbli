import { redirect } from 'next/navigation';

import { LoggedLink as Link } from '@/components/ui/link-logged';
import { Button } from '@/components/ui/button-logged';
import { Card, CardContent } from '@/components/ui/card-logged';
import { listBuyerBriefs } from '@/lib/services/briefs';
import { getSessionContext } from '@/lib/auth/session';
import { hasInviteAccess, shouldRequireInviteCode } from '@/lib/invite/config';
import { BriefCard } from '@/components/brief/brief-card';

// Revalidate every 60 seconds - fresh data without force-dynamic
export const revalidate = 60;

export default async function BriefsPage() {
  console.log('[DEBUG][BriefsPage] render start', { timestamp: new Date().toISOString() });
  const session = await getSessionContext();
  console.log('[DEBUG][BriefsPage] session fetched', {
    hasSession: Boolean(session),
    role: session?.role,
    userId: session?.userId,
    timestamp: new Date().toISOString(),
  });
  if (!session || session.role !== 'buyer') {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">This area is for buyers</h1>
        <p className="text-muted-foreground">Sign in as a buyer to see your briefs.</p>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </main>
    );
  }

  const requireInvite = shouldRequireInviteCode();
  console.log('[DEBUG][BriefsPage] invite requirement', {
    requireInvite,
    hasInviteAccess: hasInviteAccess(session.metadata ?? {}),
    timestamp: new Date().toISOString(),
  });
  if (requireInvite && !hasInviteAccess(session.metadata ?? {})) {
    redirect('/invite-code?next=/briefs');
  }

  const briefs = await listBuyerBriefs(session.userId);
  console.log('[DEBUG][BriefsPage] briefs loaded', {
    briefsCount: briefs.length,
    briefIds: briefs.map((brief) => brief.id),
    timestamp: new Date().toISOString(),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your search briefs</h1>
          <p className="text-sm text-muted-foreground">Track dealer invites, quotes, and contract progress in one place.</p>
        </div>
        <Button asChild>
          <Link href="/briefs/new">New brief</Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {briefs.map((brief) => (
          <BriefCard key={brief.id} brief={brief} />
        ))}
        {briefs.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">No briefs yet.</p>
              <Button asChild>
                <Link href="/briefs/new">Create your first brief</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
