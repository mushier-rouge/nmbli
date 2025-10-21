import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    // Polyfill __dirname for edge runtime - must be inside middleware to ensure it runs first
    const globalDirname = globalThis as { __dirname?: string };
    if (typeof globalDirname.__dirname === 'undefined') {
      Object.defineProperty(globalDirname, '__dirname', {
        value: '/',
        configurable: true,
        enumerable: false,
        writable: false,
      });
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // This error will be caught by the Vercel build process and displayed in the deployment logs.
      throw new Error(
        'Missing Supabase environment variables: expected NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY to be available. Please check your Vercel project settings.'
      );
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is set, update the request's cookies.
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the request's cookies.
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    // Log error but don't expose internal details to client
    console.error('Middleware error:', error);

    // Return 404 for bot/scanner requests, 500 for legitimate traffic
    const path = request.nextUrl.pathname;
    const isBot = path.includes('wp-') ||
                  path.includes('wordpress') ||
                  path.includes('.php') ||
                  path.includes('.env') ||
                  path.includes('admin');

    if (isBot) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
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
