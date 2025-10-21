import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Just pass through - session management moved to Server Components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     * - /api/public/* (public API routes)
     * - Common bot/scanner paths (wp-, wordpress, .php, .env, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.php|wp-|wordpress|admin\\.php|\\.env).*)',
  ],
};
