import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';

import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/generated/prisma';

import { createServerClient } from '@/lib/supabase/server-client';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function resolveRole(metadata: Record<string, unknown> | null | undefined): UserRole {
  const rawRole = (metadata?.role as string | undefined) ?? 'buyer';
  if (rawRole === 'buyer' || rawRole === 'dealer' || rawRole === 'ops') {
    return rawRole;
  }
  return 'buyer';
}

async function syncUserRecord(user: User) {
  const email = user.email ?? 'unknown@example.com';
  const role = resolveRole(user.user_metadata);
  const name = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0];

  await prisma.user.upsert({
    where: { email },
    update: {
      id: user.id,
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
}

async function ensureRoleMetadata(user: User, supabase: ReturnType<typeof createServerClient>) {
  // Always sync role from database to Supabase metadata
  const email = user.email;
  if (!email) {
    return;
  }

  try {
    // Get the role from the database (source of truth)
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    if (!dbUser) {
      console.warn('[auth][password-login] User not found in database:', email);
      return;
    }

    // Update Supabase metadata to match database
    const { error } = await supabase.auth.updateUser({
      data: {
        role: dbUser.role,
      },
    });

    if (error) {
      console.warn('[auth][password-login] Failed to sync role metadata', error.message);
    } else {
      console.log('[auth][password-login] Synced role metadata:', { email, role: dbUser.role });
    }
  } catch (error) {
    console.error('[auth][password-login] Error syncing role:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    if (!data.session || !data.session.user) {
      return NextResponse.json({ message: 'No session created' }, { status: 401 });
    }

    await syncUserRecord(data.session.user);
    await ensureRoleMetadata(data.session.user, supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password login error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
