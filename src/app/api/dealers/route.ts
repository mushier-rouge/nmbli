import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { listDealers } from '@/lib/services/dealers';

export async function GET() {
  try {
    await requireSession(['ops']);
    const dealers = await listDealers();
    return NextResponse.json({ dealers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
