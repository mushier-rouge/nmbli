'use client';

import { LoggedLink as Link } from '@/components/ui/link-logged';
import { Button } from '@/components/ui/button-logged';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card-logged';
import { Badge } from '@/components/ui/badge-logged';

const testBriefs = [
  {
    id: 'test-1',
    makes: ['Tesla', 'BMW'],
    models: ['Model 3', '3 Series'],
    status: 'sourcing',
    paymentPreferences: [{ downPayment: 4000, monthlyBudget: 500, termMonths: 36 }],
  },
  {
    id: 'test-2',
    makes: ['Audi', 'Mercedes-Benz'],
    models: ['A4', 'C-Class'],
    status: 'sourcing',
    paymentPreferences: [{ downPayment: 6000, monthlyBudget: 700, termMonths: 60 }],
  },
];

export default function TestBriefsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Test Briefs (for debugging)</h1>
          <p className="text-sm text-muted-foreground">This page renders briefs without authentication</p>
        </div>
        <Button asChild>
          <Link href="/briefs/new">New brief</Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {testBriefs.map((brief) => {
          console.log('[TEST BRIEFS RENDER]', brief);

          return (
            <Card key={brief.id} className="flex h-full flex-col justify-between">
              <CardHeader>
                <CardTitle>
                  <span>
                    {(() => {
                      const makes = Array.isArray(brief.makes) ? brief.makes.join(', ') : '';
                      const models = Array.isArray(brief.models) ? brief.models.join(', ') : '';
                      return `${makes} ${models}`.trim();
                    })()}
                  </span>
                </CardTitle>
                <Badge variant="outline">
                  <span>{String(brief.status)}</span>
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Payment: ${brief.paymentPreferences[0]?.monthlyBudget}/mo</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/briefs/${brief.id}`}>View details</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
