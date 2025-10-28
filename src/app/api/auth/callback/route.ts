import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { UserRole } from '@/generated/prisma';
import { debugAuth } from '@/lib/debug';

function resolveRedirect(nextParam: string | null, origin: string) {
  if (!nextParam) {
    return new URL('/briefs', origin);
  }

  try {
    const decoded = decodeURIComponent(nextParam);
    if (decoded.startsWith('http')) {
      return new URL(decoded);
    }
    return new URL(decoded.startsWith('/') ? decoded : `/${decoded}`, origin);
  } catch (error) {
    console.warn('Failed to decode next param', error);
    return new URL('/briefs', origin);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const codeParam = url.searchParams.get('code');
  const tokenParam = url.searchParams.get('token');
  const tokenHashParam = url.searchParams.get('token_hash');
  const code = codeParam ?? tokenParam ?? tokenHashParam;
  const nextParam = url.searchParams.get('next');

  const queryParams = Object.fromEntries(url.searchParams.entries());
  debugAuth('callback', 'Received request', {
    hasCode: Boolean(code),
    code,
    nextParam,
    query: queryParams,
    headers: Object.fromEntries(request.headers.entries()),
    cookies: request.headers.get('cookie'),
  });

  if (!code) {
    return NextResponse.redirect(new URL('/login?reason=missing_code', url.origin));
  }

  const redirectResponse = NextResponse.redirect(resolveRedirect(nextParam, url.origin));
  const supabase = createSupabaseRouteClient(request, redirectResponse);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    debugAuth('callback', 'Magic link exchange failed', { error: error?.message });
    return NextResponse.redirect(new URL(`/login?reason=${encodeURIComponent(error?.message ?? 'no_session')}`, url.origin));
  }

  const { session } = data;
  const user = session.user;
  const email = user.email ?? 'unknown@example.com';
  const rawRole = (user.user_metadata?.role as string | undefined) ?? 'buyer';
  const role: UserRole = ['buyer', 'dealer', 'ops'].includes(rawRole) ? (rawRole as UserRole) : 'buyer';
  const name = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0];
  const inviteCode = user.user_metadata?.inviteCode as string | undefined;

  debugAuth('callback', 'Session established', {
    email,
    role,
    userId: user.id,
    expiresAt: session.expires_at,
    accessToken: session.access_token ? '<present>' : '<missing>',
    inviteCode: inviteCode ? '<present>' : '<missing>',
  });

  // Check if this is a new user
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  // For new users, validate and consume invite code
  if (!existingUser && inviteCode) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.toLowerCase().trim() },
    });

    if (!invite) {
      debugAuth('callback', 'Invalid invite code', { inviteCode });
      return NextResponse.redirect(new URL('/login?reason=invalid_invite_code', url.origin));
    }

    if (invite.usedAt) {
      debugAuth('callback', 'Invite code already used', { inviteCode, usedAt: invite.usedAt });
      return NextResponse.redirect(new URL('/login?reason=invite_code_used', url.origin));
    }

    // Mark invite code as used
    await prisma.inviteCode.update({
      where: { code: inviteCode.toLowerCase().trim() },
      data: {
        usedAt: new Date(),
        usedByEmail: email,
        usedByUserId: user.id,
      },
    });

    debugAuth('callback', 'Invite code consumed', { inviteCode, email });
  } else if (!existingUser) {
    // New user without invite code
    debugAuth('callback', 'New user missing invite code', { email });
    return NextResponse.redirect(new URL('/login?reason=invite_code_required', url.origin));
  }

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email,
      role,
      name,
    },
    create: {
      id: user.id,
      email,
      role,
      name,
    },
  });

  if (!user.user_metadata?.role) {
    const updateResult = await supabase.auth.updateUser({
      data: {
        role,
      },
    });
    if (updateResult.error) {
      debugAuth('callback', 'Failed to persist role metadata', { error: updateResult.error.message });
    } else {
      debugAuth('callback', 'Role metadata persisted');
    }
  }

  debugAuth('callback', 'Redirecting after callback', {
    redirect: redirectResponse.headers.get('location'),
  });

  return redirectResponse;
}
