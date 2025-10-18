import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { acceptQuote } from '@/lib/services/quotes';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['buyer']);
    const { id } = await params;
    const quote = await acceptQuote({ quoteId: id, buyerId: session.userId });
    return NextResponse.json({ quote });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to accept quote' }, { status: 500 });
  }
}
