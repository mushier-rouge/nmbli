import { redirect } from 'next/navigation';

import { LoggedLink as Link } from '@/components/ui/link-logged';
import { Button } from '@/components/ui/button-logged';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-logged';
import { Badge } from '@/components/ui/badge-logged';
import { listBuyerBriefs } from '@/lib/services/briefs';
import { getSessionContext } from '@/lib/auth/session';
import { hasInviteAccess, shouldRequireInviteCode } from '@/lib/invite/config';
import { formatPaymentSummary } from '@/lib/utils/payment';
import { formatCurrency } from '@/lib/utils/number';

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
        {briefs.map((brief) => {
          console.log('[BRIEFS PAGE RENDER]', {
            briefId: brief.id,
            makes: brief.makes,
            makesType: typeof brief.makes,
            makesIsArray: Array.isArray(brief.makes),
            models: brief.models,
            modelsType: typeof brief.models,
            status: brief.status,
            statusType: typeof brief.status,
            paymentPreferences: brief.paymentPreferences,
            paymentPrefType: typeof brief.paymentPreferences,
          });

          return (
          <Card key={brief.id} className="flex h-full flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  <span>
                    {(() => {
                      const makes = Array.isArray(brief.makes) ? brief.makes.filter(m => m != null).map(m => String(m)).join(', ') : '';
                      const models = Array.isArray(brief.models) ? brief.models.filter(m => m != null).map(m => String(m)).join(', ') : '';
                      const result = `${makes} ${models}`.trim();
                      console.log('[CARD TITLE]', { makes, models, result, resultType: typeof result });
                      return result;
                    })()}
                  </span>
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  <span>{String(brief.status)}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">ZIP {String(brief.zipcode)} · Max OTD {formatCurrency(brief.maxOTD.toNumber())}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Payment preferences</p>
                {(() => {
                  const paymentSummaries = formatPaymentSummary(brief.paymentPreferences, brief.paymentType);
                  console.log('[PAYMENT SUMMARIES]', {
                    briefId: brief.id,
                    paymentSummaries,
                    isArray: Array.isArray(paymentSummaries),
                    length: paymentSummaries.length,
                    types: paymentSummaries.map(s => typeof s),
                  });
                  if (paymentSummaries.length === 0) {
                    return <p className="text-sm text-muted-foreground">Not specified</p>;
                  }
                  return (
                    <ul className="text-sm text-muted-foreground">
                      {paymentSummaries
                        .filter((summary) => {
                          const isValid = summary != null && typeof summary === 'string';
                          if (!isValid) {
                            console.error('[INVALID PAYMENT SUMMARY]', { summary, type: typeof summary });
                          }
                          return isValid;
                        })
                        .map((summary, index) => {
                          console.log('[RENDERING PAYMENT]', { index, summary, type: typeof summary });
                          return (
                            <li key={`${brief.id}-payment-${index}`}><span>{String(summary)}</span></li>
                          );
                        })}
                    </ul>
                  );
                })()}
              </div>
              {Array.isArray(brief.mustHaves) && brief.mustHaves.length > 0 && (
                <p className="text-sm text-muted-foreground">Must-haves: {brief.mustHaves.filter(m => m != null).map(m => String(m)).join(', ')}</p>
              )}
              <p className="text-xs text-muted-foreground">Last updated {new Date(brief.updatedAt).toLocaleDateString()}</p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/briefs/${brief.id}`}>Open timeline</Link>
              </Button>
            </CardFooter>
          </Card>
          );
        })}
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
