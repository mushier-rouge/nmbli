import { NextRequest, NextResponse } from 'next/server';

import { getInviteByToken, markInviteViewed } from '@/lib/services/dealers';
import { dealerQuoteSchema } from '@/lib/validation/quote';
import { submitDealerQuote } from '@/lib/services/quotes';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invite = await getInviteByToken(token);

    if (!invite) {
      return NextResponse.json({ message: 'Invite not found' }, { status: 404 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ message: 'Invite expired' }, { status: 410 });
    }

    await markInviteViewed(invite.id);

    return NextResponse.json({ invite });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to load invite' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ message: 'Invite not found' }, { status: 404 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ message: 'Invite expired' }, { status: 410 });
    }

    const formData = await request.formData();
    const payloadRaw = formData.get('payload');

    if (!payloadRaw || typeof payloadRaw !== 'string') {
      return NextResponse.json({ message: 'Missing payload' }, { status: 400 });
    }

    const parsedPayload = dealerQuoteSchema.parse(JSON.parse(payloadRaw));

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0);

    const quote = await submitDealerQuote({
      inviteId: invite.id,
      dealerId: invite.dealerId,
      briefId: invite.briefId,
      input: parsedPayload,
      files,
    });

    return NextResponse.json({ quoteId: quote.id });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to submit quote' }, { status: 500 });
  }
}
