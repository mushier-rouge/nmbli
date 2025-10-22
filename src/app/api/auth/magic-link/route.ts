import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { debugAuth } from '@/lib/debug';

// Fixed NEXT_PUBLIC_APP_URL - rebuild to pick up corrected env var

const requestSchema = z.object({
  email: z.string().email(),
  roleHint: z.enum(['buyer', 'dealer', 'ops']).default('buyer'),
  redirectTo: z
    .string()
    .url()
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { email, roleHint, redirectTo } = requestSchema.parse(body);

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

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect,
      data: {
        role: roleHint,
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
