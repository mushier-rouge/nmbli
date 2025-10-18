import { NextRequest, NextResponse } from 'next/server';

import { counterRequestSchema } from '@/lib/validation/quote';
import { sendCounterEmail } from '@/lib/services/email';
import { sendCounter } from '@/lib/services/quotes';
import { requireSession } from '@/lib/auth/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['buyer', 'ops']);
    const body = await request.json();
    const counter = counterRequestSchema.parse(body);
    const { id } = await params;

    const quote = await sendCounter({
      quoteId: id,
      actor: session.role as 'buyer' | 'ops',
      request: counter,
    });

    const inviteLink = quote.invite
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/d/${quote.invite.magicLinkToken}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ops/quotes/${quote.id}`;

    await sendCounterEmail({
      dealerEmail: quote.dealer.contactEmail,
      dealerName: quote.dealer.contactName || quote.dealer.name,
      quoteSummary: `${quote.year ?? ''} ${quote.make ?? ''} ${quote.model ?? ''}`.trim(),
      counter,
      link: inviteLink,
    });

    return NextResponse.json({ status: 'sent' });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to send counter' }, { status: 500 });
  }
}
