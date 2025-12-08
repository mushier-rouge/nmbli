import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const response = NextResponse.redirect(new URL(next, request.url));
        const supabase = createSupabaseRouteClient(request, response);

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return response;
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}
