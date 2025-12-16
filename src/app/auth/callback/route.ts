import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/briefs';

  console.log('[AUTH CALLBACK ROUTE] Received callback', {
    hasCode: !!code,
    next,
    origin
  });

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseRouteClient(request, response);

    console.log('[AUTH CALLBACK ROUTE] Exchanging code for session');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[AUTH CALLBACK ROUTE] Exchange failed:', error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (!data.user) {
      console.error('[AUTH CALLBACK ROUTE] No user in response');
      return NextResponse.redirect(`${origin}/login?error=no_user`);
    }

    console.log('[AUTH CALLBACK ROUTE] Exchange successful, user:', data.user.email);

    // Create/update user in database
    try {
      await prisma.user.upsert({
        where: { email: data.user.email! },
        update: {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
        },
        create: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          role: 'buyer',
        },
      });
      console.log('[AUTH CALLBACK ROUTE] User record created/updated');
    } catch (dbError) {
      console.error('[AUTH CALLBACK ROUTE] Database error:', dbError);
      // Don't fail the auth flow for DB errors
    }

    return response;
  }

  console.error('[AUTH CALLBACK ROUTE] No code in URL');
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
