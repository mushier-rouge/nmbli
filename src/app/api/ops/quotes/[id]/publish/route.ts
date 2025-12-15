import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { publishDraftQuote } from '@/lib/services/quotes';

const schema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ops']);
    const body = await request.json().catch(() => ({}));
    const { confidence, note } = schema.parse(body);
    const { id } = await params;
    const quote = await publishDraftQuote({ quoteId: id, confidence, note });
    return NextResponse.json({ quote });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Failed to publish quote' }, { status: 400 });
  }
}
