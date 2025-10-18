import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ingestEmailQuote } from '@/lib/services/quotes';

const schema = z.object({
  briefId: z.string().uuid(),
  dealerEmail: z.string().email(),
  subject: z.string().default(''),
  body: z.string().default(''),
  attachments: z
    .array(
      z.object({
        fileName: z.string().default('attachment.pdf'),
        mimeType: z.string().default('application/pdf'),
        content: z.string(),
      })
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  const ingestKey = process.env.EMAIL_INGEST_SECRET;
  if (ingestKey) {
    const provided = request.headers.get('x-ingest-key');
    if (provided !== ingestKey) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const payload = schema.parse(body);
    const quote = await ingestEmailQuote(payload);
    return NextResponse.json({ quoteId: quote.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to ingest email' }, { status: 400 });
  }
}
