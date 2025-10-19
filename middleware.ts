import { NextRequest, NextResponse } from 'next/server';

import { hasInviteAccess as sessionHasInviteAccess, shouldRequireInviteCode } from '@/lib/invite/config';

const DEBUG_AUTH = (process.env.DEBUG_AUTH ?? '').toLowerCase() === 'true';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_CHUNK_SIZE = 3180;

if (typeof (globalThis as Record<string, unknown>).__dirname === 'undefined') {
  Object.defineProperty(globalThis, '__dirname', {
    value: '/',
    configurable: false,
    enumerable: false,
    writable: false,
  });
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

function mergeCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

function getSupabaseCookieName(url: string | undefined) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const projectRef = host.split('.')[0];
    if (!projectRef) return null;
    return `sb-${projectRef}-auth-token`;
  } catch (error) {
    debugAuth('cookie', 'Failed to derive cookie name', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function readSupabaseCookie(request: NextRequest, baseName: string) {
  const base = request.cookies.get(baseName)?.value;
  if (base) {
    return { value: base, chunks: 0 };
  }
  const pieces: string[] = [];
  for (let index = 0; index < 24; index += 1) {
    const part = request.cookies.get(`${baseName}.${index}`)?.value;
    if (!part) break;
    pieces.push(part);
  }
  if (pieces.length === 0) {
    return { value: null, chunks: 0 };
  }
  return { value: pieces.join(''), chunks: pieces.length };
}

function clearSupabaseCookie(response: NextResponse, baseName: string, previousChunkCount: number) {
  response.cookies.set({ name: baseName, value: '', path: '/', maxAge: 0 });
  const limit = Math.max(previousChunkCount, 4);
  for (let index = 0; index < limit; index += 1) {
    response.cookies.set({ name: `${baseName}.${index}`, value: '', path: '/', maxAge: 0 });
  }
}

function writeSupabaseCookie(
  response: NextResponse,
  baseName: string,
  rawValue: string,
  previousChunkCount: number,
) {
  if (!rawValue) {
    clearSupabaseCookie(response, baseName, previousChunkCount);
    return;
  }
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
  if (rawValue.length <= COOKIE_CHUNK_SIZE) {
    response.cookies.set({ name: baseName, value: rawValue, ...cookieOptions });
    clearSupabaseCookie(response, baseName, previousChunkCount);
    return;
  }
  clearSupabaseCookie(response, baseName, previousChunkCount);
  const matcher = new RegExp(`.{1,${COOKIE_CHUNK_SIZE}}`, 'g');
  const chunks = rawValue.match(matcher) ?? [];
  chunks.forEach((chunk, index) => {
    response.cookies.set({ name: `${baseName}.${index}`, value: chunk, ...cookieOptions });
  });
}

type StoredSession =
  | {
      access_token: string;
      refresh_token: string | null;
      provider_token?: string | null;
      provider_refresh_token?: string | null;
    }
  | null;

function parseStoredSession(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        access_token: typeof parsed[0] === 'string' ? parsed[0] : '',
        refresh_token: typeof parsed[1] === 'string' ? parsed[1] : null,
        provider_token: typeof parsed[2] === 'string' ? parsed[2] : null,
        provider_refresh_token: typeof parsed[3] === 'string' ? parsed[3] : null,
      } satisfies StoredSession;
    }
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const record = parsed as Record<string, unknown>;
      return {
        access_token: typeof record.access_token === 'string' ? record.access_token : '',
        refresh_token: typeof record.refresh_token === 'string' ? record.refresh_token : null,
        provider_token: typeof record.provider_token === 'string' ? record.provider_token : null,
        provider_refresh_token:
          typeof record.provider_refresh_token === 'string' ? record.provider_refresh_token : null,
      } satisfies StoredSession;
    }
  } catch (error) {
    debugAuth('cookie', 'Failed to parse stored session', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
}

interface SupabaseUserResponse {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
  status: number;
}

async function fetchSupabaseUser(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string,
): Promise<SupabaseUserResponse> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { status: response.status, user: null };
    }

    const user = (await response.json()) as SupabaseUserResponse['user'];
    return { status: response.status, user };
  } catch (error) {
    debugAuth('supabase', 'User lookup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 500, user: null };
  }
}

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string | null;
  provider_token?: string | null;
  provider_refresh_token?: string | null;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseUserResponse['user'];
}

async function refreshSupabaseSession(
  supabaseUrl: string,
  supabaseAnonKey: string,
  refreshToken: string,
): Promise<SupabaseTokenResponse | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      cache: 'no-store',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      debugAuth('supabase', 'Refresh failed', { status: response.status });
      return null;
    }

    const data = (await response.json()) as SupabaseTokenResponse;
    return data;
  } catch (error) {
    debugAuth('supabase', 'Refresh threw', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

interface ResolvedSupabaseSession {
  access_token: string;
  refresh_token: string | null;
  user: NonNullable<SupabaseUserResponse['user']>;
}

async function resolveSupabaseSession(
  request: NextRequest,
  response: NextResponse,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<ResolvedSupabaseSession | null> {
  const cookieName = getSupabaseCookieName(supabaseUrl);
  if (!cookieName) {
    debugAuth('cookie', 'Missing cookie name');
    return null;
  }

  const storedCookie = readSupabaseCookie(request, cookieName);
  const storedSession = parseStoredSession(storedCookie.value);
  if (!storedSession || !storedSession.access_token) {
    debugAuth('cookie', 'No stored session in cookies', { chunks: storedCookie.chunks });
    return null;
  }

  let userResponse = await fetchSupabaseUser(supabaseUrl, supabaseAnonKey, storedSession.access_token);

  if (userResponse.status === 401 && storedSession.refresh_token) {
    const refreshed = await refreshSupabaseSession(supabaseUrl, supabaseAnonKey, storedSession.refresh_token);
    if (!refreshed || !refreshed.access_token) {
      clearSupabaseCookie(response, cookieName, storedCookie.chunks);
      return null;
    }

    const sessionString = JSON.stringify([
      refreshed.access_token,
      refreshed.refresh_token ?? storedSession.refresh_token,
      refreshed.provider_token ?? storedSession.provider_token ?? null,
      refreshed.provider_refresh_token ?? storedSession.provider_refresh_token ?? null,
    ]);
    writeSupabaseCookie(response, cookieName, sessionString, storedCookie.chunks);

    userResponse = {
      status: 200,
      user: refreshed.user ?? null,
    };
    storedSession.access_token = refreshed.access_token;
    storedSession.refresh_token = refreshed.refresh_token ?? storedSession.refresh_token;
  }

  if (userResponse.status !== 200 || !userResponse.user) {
    debugAuth('supabase', 'User fetch returned non-200', {
      status: userResponse.status,
    });
    return null;
  }

  return {
    access_token: storedSession.access_token,
    refresh_token: storedSession.refresh_token,
    user: userResponse.user,
  };
}

function hasInviteAccess(metadata: Record<string, unknown> | null | undefined) {
  return sessionHasInviteAccess(metadata ?? {});
}

export async function middleware(request: NextRequest) {
  try {
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
      debugAuth('config', 'Missing Supabase env');
      return NextResponse.redirect(new URL('/login?reason=missing_supabase', request.url));
    }

    debugAuth('middleware', 'Evaluating request', {
      path: pathname,
      cookies: request.cookies.getAll().map((cookie) => cookie.name),
    });

    const resolvedSession = await resolveSupabaseSession(request, response, supabaseUrl, supabaseAnonKey);

    if (!resolvedSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    const { user } = resolvedSession;
    const role = (user.user_metadata?.role as string | undefined) ?? 'buyer';

    debugAuth('middleware', 'Session detected', {
      path: pathname,
      role,
      email: user.email ?? null,
    });

    if (pathMatches(pathname, OPS_ONLY_PATHS) && role !== 'ops') {
      const redirectResponse = NextResponse.redirect(new URL('/not-authorized', request.url));
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    const requireInvite = shouldRequireInviteCode();
    const isInvitePage = pathname.startsWith('/invite-code');
    const metadataInvite = hasInviteAccess(user.user_metadata);

    if (requireInvite && role === 'buyer' && !metadataInvite && !isInvitePage) {
      const inviteUrl = new URL('/invite-code', request.url);
      inviteUrl.searchParams.set('next', pathname + request.nextUrl.search);
      const redirectResponse = NextResponse.redirect(inviteUrl);
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    if (isInvitePage && metadataInvite) {
      const nextParam = request.nextUrl.searchParams.get('next');
      const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/briefs';
      const redirectResponse = NextResponse.redirect(new URL(nextPath, request.url));
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    mergeCookies(response, response);
    return response;
  } catch (error) {
    console.error('[middleware] Unhandled failure', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    throw error;
  }
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\..*).*)'],
};
