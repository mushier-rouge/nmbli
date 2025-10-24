import { cache } from 'react';
import { cookies } from 'next/headers';

import type { UserRole } from '@/generated/prisma';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface SessionContext {
  userId: string;
  email: string;
  role: UserRole;
  metadata: Record<string, unknown>;
  impersonatedDealerId?: string | null;
}

export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  try {
    console.log('[DEBUG][getSessionContext] start', { timestamp: new Date().toISOString() });
    const supabase = await getSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      console.log('[DEBUG][getSessionContext] no session returned', { timestamp: new Date().toISOString() });
      return null;
    }

    const role = (session.user.user_metadata?.role as UserRole | undefined) ?? 'buyer';
    const cookieStore = await cookies();
    const impersonatedDealerId = cookieStore.get('impersonateDealerId')?.value ?? null;

    console.log('[DEBUG][getSessionContext] session resolved', {
      userId: session.user.id,
      email: session.user.email,
      role,
      impersonatedDealerId,
      timestamp: new Date().toISOString(),
    });

    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role,
      metadata: session.user.user_metadata ?? {},
      impersonatedDealerId,
    };
  } catch (error) {
    console.error('Failed to create session context', error);
    return null;
  }
});

export async function requireSession(roles?: UserRole[]) {
  const session = await getSessionContext();
  if (!session) {
    throw new Error('Unauthenticated');
  }

  if (roles && roles.length > 0 && !roles.includes(session.role)) {
    throw new Error('Forbidden');
  }

  return session;
}
