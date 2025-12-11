import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        console.log('[Auth Callback] Processing code:', { code: '********', next });
        const response = NextResponse.redirect(new URL(next, request.url));
        const supabase = createSupabaseRouteClient(request, response);

        console.log('[Auth Callback] Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            console.log('[Auth Callback] Session exchange successful');

            // Create or update User record in database
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
                        role: 'buyer', // Default role for OAuth users
                    },
                });
                console.log('[Auth Callback] User record created/updated:', user.id);
            } catch (dbError) {
                console.error('[Auth Callback] Error creating user record:', dbError);
                // Continue with redirect even if user creation fails
                // The user has a valid session, we'll handle missing User record separately
            }

            console.log('[Auth Callback] Redirecting to:', next);
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
