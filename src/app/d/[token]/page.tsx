import Link from 'next/link';

import { DealerQuoteForm } from '@/components/dealer/dealer-quote-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInviteByToken } from '@/lib/services/dealers';

export default async function DealerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-sm text-muted-foreground">Check with your Nmbli contact for a fresh link.</p>
      </main>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">This link has expired</h1>
        <p className="text-sm text-muted-foreground">Reply to the invite email and we&apos;ll refresh your access.</p>
      </main>
    );
  }

  const brief = invite.brief;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Submit your OTD quote</CardTitle>
          <p className="text-sm text-muted-foreground">
            {brief.buyer.name?.split(' ')[0]?.[0] ?? 'Buyer'} is searching for {brief.makes.join(', ')} {brief.models.join(', ')} with a max OTD of
            ${brief.maxOTD.toNumber().toLocaleString()} in ZIP {brief.zipcode}.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Include doc fees, DMV, add-ons, incentives, and upload the signed buyer order. We&apos;ll normalize everything for the buyer.</p>
          <p>
            Need help? Email <Link href="mailto:ops@nmbli.app" className="text-primary underline">ops@nmbli.app</Link>.
          </p>
        </CardContent>
      </Card>

      <DealerQuoteForm token={token} />
    </main>
  );
}
