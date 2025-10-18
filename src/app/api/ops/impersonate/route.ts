import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';

const bodySchema = z.object({
  dealerId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Impersonation is disabled in production' }, { status: 403 });
  }

  try {
    await requireSession(['ops']);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const json = await request.json();
  const { dealerId } = bodySchema.parse(json);

  const cookieStore = await cookies();

  cookieStore.set({
    name: 'impersonateDealerId',
    value: dealerId,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  return NextResponse.json({ message: 'Impersonating dealer', dealerId });
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Impersonation is disabled in production' }, { status: 403 });
  }

  try {
    await requireSession(['ops']);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete('impersonateDealerId');

  return NextResponse.json({ message: 'Stopped impersonation' });
}
