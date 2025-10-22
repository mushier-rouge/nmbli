import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ShadinessPill } from '@/components/brief/shadiness-pill';
import { QuoteActions } from '@/components/brief/quote-actions';
import { getBriefDetail } from '@/lib/services/briefs';
import { getSessionContext } from '@/lib/auth/session';
import { canAccessBrief } from '@/lib/auth/roles';
import { formatCurrency, formatPercent } from '@/lib/utils/number';

// Revalidate every 60 seconds - fresh quote data without force-dynamic
export const revalidate = 60;

type PaymentPreferenceRecord = { type: string; downPayment?: number; monthlyBudget?: number };

function describePaymentPreference(pref: PaymentPreferenceRecord) {
  const label = pref.type.charAt(0).toUpperCase() + pref.type.slice(1);
  const parts: string[] = [label];
  if (typeof pref.downPayment === 'number' && !Number.isNaN(pref.downPayment)) {
    parts.push(`${formatCurrency(pref.downPayment)} down`);
  }
  if (typeof pref.monthlyBudget === 'number' && !Number.isNaN(pref.monthlyBudget)) {
    parts.push(`${formatCurrency(pref.monthlyBudget)} / mo`);
  }
  return parts.join(' • ');
}

function extractPaymentPreferences(paymentPreferences: unknown) {
  return Array.isArray(paymentPreferences)
    ? (paymentPreferences as PaymentPreferenceRecord[])
    : [];
}

const TIMELINE_STEPS: Array<{ key: string; label: string }> = [
  { key: 'sourcing', label: 'Sourcing' },
  { key: 'offers', label: 'Offers' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'contract', label: 'Contract' },
  { key: 'done', label: 'Done' },
];

function computeStepState(current: string, step: string) {
  const order = TIMELINE_STEPS.map((item) => item.key);
  const currentIndex = order.indexOf(current);
  const stepIndex = order.indexOf(step);
  if (stepIndex === -1 || currentIndex === -1) return 'pending';
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

export default async function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const brief = await getBriefDetail(id);
  if (!brief) {
    redirect('/briefs');
  }

  if (!canAccessBrief(session, brief.buyerId)) {
    redirect('/not-authorized');
  }

  const sortedQuotes = [...brief.quotes].sort((a, b) => {
    const aTotal = a.otdTotal?.toNumber() ?? Number.MAX_SAFE_INTEGER;
    const bTotal = b.otdTotal?.toNumber() ?? Number.MAX_SAFE_INTEGER;
    return aTotal - bTotal;
  });

  const acceptedQuoteId = brief.quotes.find((quote) => quote.status === 'accepted')?.id;

  const timelineEvents = brief.timelineEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{brief.makes.join(', ')} {brief.models.join(', ')}</h1>
              <Badge variant="outline" className="capitalize">
                {brief.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">ZIP {brief.zipcode} · Max OTD {formatCurrency(brief.maxOTD.toNumber())}</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Payment preferences</p>
              {extractPaymentPreferences(brief.paymentPreferences).length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {extractPaymentPreferences(brief.paymentPreferences).map((pref, index) => (
                    <li key={`${pref.type}-${index}`}>{describePaymentPreference(pref)}</li>
                  ))}
                </ul>
              ) : (
                <p>No payment preferences recorded.</p>
              )}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/briefs">Back to briefs</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TIMELINE_STEPS.map((step) => {
            const state = computeStepState(brief.status, step.key);
            return (
              <span
                key={step.key}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  state === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : state === 'active'
                      ? 'border border-primary/50 text-primary'
                      : 'border border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            );
          })}
        </div>
      </header>

      <Tabs defaultValue="offers" className="w-full">
        <TabsList>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="counters">Counters</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>
        <TabsContent value="offers" className="space-y-6 pt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedQuotes.map((quote) => {
              const addons = quote.lines.filter((line) => line.kind === 'addon');
              const incentives = quote.lines.filter((line) => line.kind === 'incentive');
              const otherFees = quote.lines.filter((line) =>
                line.kind === 'fee' && !['Doc Fee', 'DMV / Registration', 'Tire & Battery'].includes(line.name)
              );
              const otd = quote.otdTotal?.toNumber();

              const badges: string[] = [];
              if (quote.id === acceptedQuoteId) badges.push('Accepted');
              if (sortedQuotes[0]?.id === quote.id) badges.push('Lowest');
              if (addons.length === 0) badges.push('Cleanest');
              if (quote.etaDate && quote.etaDate < new Date(Date.now() + 1000 * 60 * 60 * 24 * 10)) badges.push('Fastest');

              return (
                <Card key={quote.id} className={`flex flex-col gap-4 ${quote.id === acceptedQuoteId ? 'border-primary' : ''}`}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg font-semibold">
                        {quote.dealer.name}
                      </CardTitle>
                      <ShadinessPill score={quote.shadinessScore ?? 0} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {badges.map((badge) => (
                        <Badge key={badge} variant="secondary" className="uppercase tracking-wide">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span>
                        VIN {quote.vin ?? '—'} · ETA {quote.etaDate ? quote.etaDate.toLocaleDateString() : '—'}
                      </span>
                      <span>
                        MSRP {quote.msrp ? formatCurrency(quote.msrp.toNumber()) : '—'} · Discount{' '}
                        {quote.dealerDiscount ? formatCurrency(quote.dealerDiscount.toNumber()) : '—'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xl font-semibold">
                      <span>OTD</span>
                      <span>{otd ? formatCurrency(otd) : 'Pending'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="font-medium">Fees</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>Doc: {quote.docFee ? formatCurrency(quote.docFee.toNumber()) : '-'}</li>
                          <li>DMV: {quote.dmvFee ? formatCurrency(quote.dmvFee.toNumber()) : '-'}</li>
                          <li>Tire/Battery: {quote.tireBatteryFee ? formatCurrency(quote.tireBatteryFee.toNumber()) : '-'}</li>
                          {otherFees.map((line) => (
                            <li key={line.id}>{line.name}: {formatCurrency(line.amount.toNumber())}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Incentives</p>
                        <ul className="space-y-1 text-muted-foreground">
                          {incentives.length === 0 && <li>None</li>}
                          {incentives.map((line) => (
                            <li key={line.id}>
                              {line.name}: {formatCurrency(line.amount.toNumber())}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Add-ons</p>
                        <ul className="space-y-1 text-muted-foreground">
                          {addons.length === 0 && <li>None</li>}
                          {addons.map((line) => (
                            <li key={line.id}>
                              {line.name}: {formatCurrency(line.amount.toNumber())}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <span>Tax rate {quote.taxRate ? formatPercent(quote.taxRate.toNumber()) : '—'}</span>
                      <span>
                        Confidence {quote.confidence ? `${(quote.confidence.toNumber() * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <QuoteActions quoteId={quote.id} status={quote.status} addons={addons.map((line) => ({ name: line.name }))} />
                  </CardFooter>
                </Card>
              );
            })}
            {sortedQuotes.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <p>No quotes yet. We&apos;ll notify you as soon as a dealer responds.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="counters" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Negotiation timeline</CardTitle>
              <p className="text-sm text-muted-foreground">Every counter shows up here so you have the full story.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {timelineEvents
                .filter((event) => event.type === 'counter_sent' || event.type === 'quote_revised')
                .map((event) => (
                  <div key={event.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{event.type.replace('_', ' ')}</span>
                      <span>{event.createdAt.toLocaleString()}</span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              {timelineEvents.filter((event) => event.type === 'counter_sent' || event.type === 'quote_revised').length === 0 && (
                <p className="text-sm text-muted-foreground">No counters yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contract" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract guardrail</CardTitle>
              <p className="text-sm text-muted-foreground">We block e-signing until the contract matches the accepted quote.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {brief.quotes
                .filter((quote) => quote.contract)
                .map((quote) => (
                  <div key={quote.id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{quote.dealer.name}</span>
                      <Badge
                        variant={
                          quote.contract?.status === 'checked_ok'
                            ? 'secondary'
                            : quote.contract?.status === 'mismatch'
                              ? 'destructive'
                              : 'outline'
                        }
                        className="capitalize"
                      >
                        {quote.contract?.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <pre className="mt-3 max-h-60 overflow-auto rounded bg-muted/50 p-3 text-xs">
                      {JSON.stringify(quote.contract?.checks, null, 2)}
                    </pre>
                  </div>
                ))}
              {brief.quotes.every((quote) => !quote.contract) && (
                <p className="text-sm text-muted-foreground">No contract uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <ul className="space-y-3">
          {timelineEvents.map((event) => (
            <li key={event.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase tracking-wide">{event.type.replace('_', ' ')}</span>
                <span>{event.createdAt.toLocaleString()}</span>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
