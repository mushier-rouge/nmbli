import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const DEBUG_AUTH = process.env.DEBUG_AUTH?.toLowerCase() === 'true';

function shouldRequireInviteCode() {
  return (process.env.DEV_REQUIRE_INVITE_CODE ?? '').toLowerCase() === 'true';
}

function hasInviteAccess(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return false;
  const value = metadata.devInviteGranted ?? metadata.dev_invite_granted;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

function debugAuth(scope: string, message: string, payload?: Record<string, unknown>) {
  if (!DEBUG_AUTH) return;
  if (payload) {
    console.info(`[auth:${scope}] ${message}`, JSON.stringify(payload));
  } else {
    console.info(`[auth:${scope}] ${message}`);
  }
}


const AUTH_PATHS = [/^\/brief/, /^\/buyer/, /^\/dashboard/, /^\/offers/, /^\/ops/, /^\/invite-code/];
const OPS_ONLY_PATHS = [/^\/ops/];

function pathMatches(path: string, matchers: RegExp[]) {
  return matchers.some((regex) => regex.test(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/d/') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/offline')
  ) {
    return NextResponse.next();
  }

  const requiresAuth = pathMatches(pathname, AUTH_PATHS);
  if (!requiresAuth) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/login?reason=missing_supabase', request.url));
  }

  debugAuth('middleware', 'Evaluating request', {
    path: pathname,
    cookies: request.cookies.getAll().map((cookie) => cookie.name),
  });

  let session = null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    });

    const supabaseSession = await supabase.auth.getSession();
    session = supabaseSession.data.session;
  } catch (error) {
    debugAuth('middleware', 'Supabase session lookup failed', {
      path: pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    debugAuth('middleware', 'No session detected', { path: pathname });
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user.user_metadata?.role as string | undefined) ?? 'buyer';
  debugAuth('middleware', 'Session detected', {
    path: pathname,
    role,
    email: session.user.email,
  });
  if (pathMatches(pathname, OPS_ONLY_PATHS) && role !== 'ops') {
    return NextResponse.redirect(new URL('/not-authorized', request.url));
  }

  const requireInvite = shouldRequireInviteCode();
  const isInvitePage = pathname.startsWith('/invite-code');
  const inviteCookie = request.cookies.get('devInviteGranted')?.value === 'true';
  const inviteUser = request.cookies.get('devInviteUser')?.value;
  const metadataInvite = hasInviteAccess(session.user.user_metadata ?? {});
  const inviteSatisfied = metadataInvite || (inviteCookie && inviteUser === session.user.id);

  if (requireInvite && role === 'buyer' && !inviteSatisfied) {
    if (!isInvitePage) {
      const inviteUrl = new URL('/invite-code', request.url);
      const nextTarget = `${pathname}${request.nextUrl.search}`;
      inviteUrl.searchParams.set('next', nextTarget);
      return NextResponse.redirect(inviteUrl);
    }
  } else if (isInvitePage && inviteSatisfied) {
    const nextParam = request.nextUrl.searchParams.get('next');
    const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/briefs';
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\..*).*)'],
};
