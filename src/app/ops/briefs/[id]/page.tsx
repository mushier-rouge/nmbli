import Link from 'next/link';
import { redirect } from 'next/navigation';

import { InviteDealersForm } from '@/components/ops/invite-dealers-form';
import { PublishQuoteButton } from '@/components/ops/publish-quote-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getSessionContext } from '@/lib/auth/session';
import { getBriefDetail } from '@/lib/services/briefs';
import { listDealers } from '@/lib/services/dealers';
import { formatCurrency } from '@/lib/utils/number';

export const dynamic = 'force-dynamic';

type PaymentPreferenceRecord = { type: string; downPayment?: number; monthlyBudget?: number };

function formatPaymentSummaries(paymentPreferences: unknown, fallbackType: string | null) {
  const preferences = Array.isArray(paymentPreferences)
    ? (paymentPreferences as PaymentPreferenceRecord[])
    : [];

  if (preferences.length === 0) {
    return fallbackType ? [fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1)] : [];
  }

  return preferences.map((pref) => {
    const label = pref.type.charAt(0).toUpperCase() + pref.type.slice(1);
    const parts: string[] = [label];
    if (typeof pref.downPayment === 'number' && !Number.isNaN(pref.downPayment)) {
      parts.push(`${formatCurrency(pref.downPayment)} down`);
    }
    if (typeof pref.monthlyBudget === 'number' && !Number.isNaN(pref.monthlyBudget)) {
      parts.push(`${formatCurrency(pref.monthlyBudget)} / mo`);
    }
    return parts.join(' • ');
  });
}

export default async function OpsBriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session || session.role !== 'ops') {
    redirect('/login');
  }

  const { id } = await params;
  const [brief, dealers] = await Promise.all([getBriefDetail(id), listDealers()]);
  if (!brief) {
    redirect('/ops');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{brief.makes.join(', ')} {brief.models.join(', ')}</h1>
          <p className="text-sm text-muted-foreground">
            Buyer {brief.buyer.name} · ZIP {brief.zipcode} · Max OTD {formatCurrency(brief.maxOTD.toNumber())}
          </p>
          <div className="text-sm text-muted-foreground">
            {(() => {
              const summaries = formatPaymentSummaries(brief.paymentPreferences, brief.paymentType);
              if (summaries.length === 0) {
                return <span className="block">No payment preferences recorded.</span>;
              }
              return summaries.map((summary) => (
                <span key={summary} className="block">{summary}</span>
              ));
            })()}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops">Back to ops</Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Invite dealers</CardTitle>
            <p className="text-sm text-muted-foreground">Select stores to send the tokenized quote link.</p>
          </CardHeader>
          <CardContent>
            <InviteDealersForm briefId={brief.id} dealers={dealers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invites</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brief.invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invite.dealer.name}</p>
                        <p className="text-xs text-muted-foreground">{invite.dealer.contactEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invite.state}
                      </Badge>
                    </TableCell>
                    <TableCell>{invite.expiresAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <code className="text-xs">/d/{invite.magicLinkToken}</code>
                    </TableCell>
                  </TableRow>
                ))}
                {brief.invites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No invites yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>OTD</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brief.quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{quote.dealer.name}</p>
                      <p className="text-xs text-muted-foreground">VIN {quote.vin ?? '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={quote.status === 'published' ? 'secondary' : quote.status === 'draft' ? 'outline' : 'destructive'} className="capitalize">
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{quote.source}</TableCell>
                  <TableCell>{quote.otdTotal ? formatCurrency(quote.otdTotal.toNumber()) : '—'}</TableCell>
                  <TableCell>
                    {quote.status === 'draft' ? <PublishQuoteButton quoteId={quote.id} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {brief.quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No quotes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
