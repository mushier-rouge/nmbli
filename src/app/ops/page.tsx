import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listLatestBriefs } from '@/lib/services/briefs';
import { getSessionContext } from '@/lib/auth/session';
import { formatPaymentSummary } from '@/lib/utils/payment';

export const dynamic = 'force-dynamic';

export default async function OpsDashboardPage() {
  const session = await getSessionContext();
  if (!session || session.role !== 'ops') {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Ops access required</h1>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </main>
    );
  }

  const briefs = await listLatestBriefs();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ops control center</h1>
          <p className="text-sm text-muted-foreground">Invite dealers, normalize quotes, and guard contracts.</p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active briefs</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {briefs.map((brief) => (
            <Card key={brief.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">{brief.makes.join(', ')} {brief.models.join(', ')}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {brief.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {brief.buyer.name} · ZIP {brief.zipcode} · Max OTD {formatCurrency(brief.maxOTD.toNumber())}
                </p>
                <div className="text-xs text-muted-foreground">
                  {formatPaymentSummary(brief.paymentPreferences, brief.paymentType).map((summary) => (
                    <span key={summary} className="block">{summary}</span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/ops/briefs/${brief.id}`}>Open brief</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
