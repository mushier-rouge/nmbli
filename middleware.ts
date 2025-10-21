import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Just pass through - session management moved to Server Components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
