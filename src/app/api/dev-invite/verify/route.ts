import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { shouldRequireInviteCode } from '@/lib/invite/config';
import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  code: z.string().regex(/^\d{6}$/u, 'Invite code must be a 6-digit number'),
});

function setInviteCookies(response: NextResponse, userId: string) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: 'devInviteGranted',
    value: 'true',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set({
    name: 'devInviteUser',
    value: userId,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const requireInvite = shouldRequireInviteCode();

  if (!requireInvite || session.role !== 'buyer') {
    const response = NextResponse.json({ status: requireInvite ? 'skipped_role' : 'invite_not_required' });
    setInviteCookies(response, session.userId);
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Invalid invite code' }, { status: 400 });
  }

  const submittedCode = parsed.data.code.trim();
  const normalizedCode = submittedCode.replace(/\s+/g, '');

  const existingInvite = await prisma.devInviteCode.findUnique({ where: { code: normalizedCode } });

  if (!existingInvite) {
    return NextResponse.json({ message: 'That invite code has already been used or is invalid' }, { status: 400 });
  }

  // Optimistically consume the invite code before we persist metadata. We'll restore it if anything fails.
  try {
    await prisma.devInviteCode.delete({ where: { code: normalizedCode } });
  } catch (error) {
    console.error('Failed to consume invite code', { code: normalizedCode, error });
    return NextResponse.json({ message: 'That invite code has already been used' }, { status: 400 });
  }

  const response = NextResponse.json({ status: 'granted' });
  const supabase = createSupabaseRouteClient(request, response);
  const { error } = await supabase.auth.updateUser({
    data: {
      ...session.metadata,
      devInviteGranted: true,
      devInviteCode: normalizedCode,
      devInviteGrantedAt: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to persist invite grant', error);
    // Restore the invite code so it can be used again.
    try {
      await prisma.devInviteCode.create({ data: { code: normalizedCode } });
    } catch (restoreError) {
      console.error('Failed to restore invite code after error', { code: normalizedCode, restoreError });
    }
    return NextResponse.json({ message: 'Could not confirm invite access' }, { status: 500 });
  }

  setInviteCookies(response, session.userId);
  return response;
}
