import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { UserRole } from '@/generated/prisma';
import { debugAuth } from '@/lib/debug';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    debugAuth('complete', 'Failed to read session', { error: error.message });
    return NextResponse.json({ message: 'Unable to read Supabase session' }, { status: 500 });
  }

  if (!session || !session.user) {
    debugAuth('complete', 'No session present');
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }

  const user = session.user;
  const email = user.email ?? 'unknown@example.com';
  const rawRole = (user.user_metadata?.role as string | undefined) ?? 'buyer';
  const role: UserRole = ['buyer', 'dealer', 'ops'].includes(rawRole) ? (rawRole as UserRole) : 'buyer';
  const name = (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0];

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
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role,
      },
    });
    if (updateError) {
      debugAuth('complete', 'Failed to persist role metadata', { error: updateError.message });
    } else {
      debugAuth('complete', 'Role metadata persisted');
    }
  }

  debugAuth('complete', 'Auth completion success', { email, role });
  return response;
}
