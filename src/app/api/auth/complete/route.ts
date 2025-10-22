import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { UserRole } from '@/generated/prisma';
import { debugAuth } from '@/lib/debug';

export async function POST(request: NextRequest) {
  try {
    debugAuth('complete', 'Starting auth completion');
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteClient(request, response);

    debugAuth('complete', 'Getting session');
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

    debugAuth('complete', 'Upserting user to database', { userId: user.id, email, role, name });

    try {
      debugAuth('complete', 'About to upsert user', { userId: user.id, email, role, name });

      // Upsert by email to handle cases where the email exists with a different Supabase ID
      await prisma.user.upsert({
        where: { email },
        update: {
          id: user.id, // Update the ID to match the current Supabase user ID
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

      debugAuth('complete', 'User upserted successfully');
    } catch (dbError) {
      // Log the full error object with all details
      console.error('Database upsert failed - Full error:', JSON.stringify(dbError, Object.getOwnPropertyNames(dbError), 2));
      console.error('Database upsert failed - Error name:', (dbError as any)?.name);
      console.error('Database upsert failed - Error message:', (dbError as any)?.message);
      console.error('Database upsert failed - Error code:', (dbError as any)?.code);
      console.error('Database upsert failed - Error meta:', (dbError as any)?.meta);

      debugAuth('complete', 'Database error', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        code: (dbError as any)?.code,
        meta: (dbError as any)?.meta,
      });

      const errorMessage = dbError instanceof Error ? dbError.message : 'Database error during user creation';
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }

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
  } catch (error) {
    console.error('Unexpected error in auth completion:', error);
    debugAuth('complete', 'Unexpected error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
