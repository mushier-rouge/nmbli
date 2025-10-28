import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { debugAuth } from '@/lib/debug';
import { prisma } from '@/lib/prisma';

// Fixed NEXT_PUBLIC_APP_URL - rebuild to pick up corrected env var

const requestSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().min(1, 'Invite code is required'),
  roleHint: z.enum(['buyer', 'dealer', 'ops']).default('buyer'),
  redirectTo: z
    .string()
    .url()
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { email, inviteCode, roleHint, redirectTo } = requestSchema.parse(body);

  // Validate invite code before sending magic link
  const invite = await prisma.inviteCode.findUnique({
    where: { code: inviteCode.toLowerCase().trim() },
  });

  if (!invite) {
    debugAuth('magic-link', 'Invalid invite code', { inviteCode });
    return NextResponse.json({ message: 'Invalid invite code' }, { status: 400 });
  }

  if (invite.usedAt) {
    debugAuth('magic-link', 'Invite code already used', { inviteCode, usedAt: invite.usedAt });
    return NextResponse.json({ message: 'Invite code has already been used' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ message: 'Supabase env vars missing' }, { status: 500 });
  }

  debugAuth('magic-link', 'Request received', {
    email,
    roleHint,
    redirectTo,
    headers: Object.fromEntries(request.headers.entries()),
  });

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const nextParam = redirectTo ? encodeURIComponent(redirectTo) : '';
  const redirect = `${appUrl}/auth/callback${nextParam ? `?next=${nextParam}` : ''}`;

  debugAuth('magic-link', 'Sending OTP with redirect', {
    email,
    appUrl,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    redirect,
    allEnvVars: Object.keys(process.env).filter(k => k.includes('APP_URL')),
  });

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect,
      data: {
        role: roleHint,
        inviteCode,
      },
    },
  });

  if (error) {
    debugAuth('magic-link', 'Failed to send magic link', { email, error: error.message });
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  debugAuth('magic-link', 'Magic link sent', { email, redirect });
  return NextResponse.json({ message: 'Magic link sent' });
}
