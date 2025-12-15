import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/briefs';

    if (!code) {
        console.warn('[Auth Callback] No code provided');
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
    }

    const response = NextResponse.redirect(new URL(next, request.url));
    const supabase = createSupabaseRouteClient(request, response);

    console.log('[Auth Callback] Exchanging code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
        console.error('[Auth Callback] Error exchanging code:', error);
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
    }

    console.log('[Auth Callback] Session exchange successful');

    try {
        const user = await prisma.user.upsert({
            where: { id: data.user.id },
            update: {
                email: data.user.email!,
                name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
            },
            create: {
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
                role: 'buyer',
            },
        });
        console.log('[Auth Callback] User record created/updated:', user.id);
    } catch (dbError) {
        console.error('[Auth Callback] Error creating user record:', dbError);
    }

    console.log('[Auth Callback] Redirecting to:', next);
    return response;
}
