import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { parseInviteCodes, shouldRequireInviteCode } from '@/lib/invite/config';

const requestSchema = z.object({
  code: z.string().min(3, 'Invite code must be at least 3 characters'),
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

  const inviteCodes = parseInviteCodes();
  if (inviteCodes.length === 0) {
    return NextResponse.json({ message: 'Invite codes are not configured' }, { status: 400 });
  }

  const submittedCode = parsed.data.code.trim();
  const matched = inviteCodes.find((value) => value.localeCompare(submittedCode, undefined, { sensitivity: 'accent' }) === 0);

  if (!matched) {
    return NextResponse.json({ message: 'That invite code is not valid yet' }, { status: 400 });
  }

  const response = NextResponse.json({ status: 'granted' });
  const supabase = createSupabaseRouteClient(request, response);
  const { error } = await supabase.auth.updateUser({
    data: {
      ...session.metadata,
      devInviteGranted: true,
      devInviteCode: matched,
      devInviteGrantedAt: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to persist invite grant', error);
    return NextResponse.json({ message: 'Could not confirm invite access' }, { status: 500 });
  }

  setInviteCookies(response, session.userId);
  return response;
}
