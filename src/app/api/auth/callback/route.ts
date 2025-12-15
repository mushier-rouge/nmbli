import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Always funnel through the client-side callback page which finalises auth
    const url = new URL(request.url);
    const next = url.searchParams.get('next') ?? '/briefs';
    const code = url.searchParams.get('code');
    const redirect = new URL('/auth/callback', request.url);
    redirect.searchParams.set('next', next);
    if (code) {
        redirect.searchParams.set('code', code);
    }
    console.log('[Auth Callback] Redirecting to client callback', { next });
    return NextResponse.redirect(redirect);
}
