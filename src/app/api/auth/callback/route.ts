import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        console.log('[Auth Callback] Processing code:', { code: '********', next });
        const response = NextResponse.redirect(new URL(next, request.url));
        const supabase = createSupabaseRouteClient(request, response);

        console.log('[Auth Callback] Exchanging code for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('[Auth Callback] Session exchange successful. Redirecting to:', next);
            return response;
        } else {
            console.error('[Auth Callback] Error exchanging code:', error);
        }
    } else {
        console.warn('[Auth Callback] No code provided');
    }

    // Return the user to an error page with instructions
    console.log('[Auth Callback] Redirecting to error page');
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}
