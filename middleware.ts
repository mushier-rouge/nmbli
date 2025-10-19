import { NextRequest, NextResponse } from 'next/server';

const DEBUG_AUTH = (process.env.DEBUG_AUTH ?? '').toLowerCase() === 'true';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_CHUNK_SIZE = 3180;

console.info('[middleware] module init');

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

function mergeCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

function getSupabaseCookieName(supabaseUrl: string) {
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch (error) {
    console.error('[middleware] Failed to derive Supabase cookie name', error);
    return null;
  }
}

function readSupabaseCookie(request: NextRequest, baseName: string) {
  const base = request.cookies.get(baseName)?.value;
  if (base) {
    return { value: base, chunkCount: 0 };
  }
  const chunks: string[] = [];
  for (let index = 0; index < 24; index += 1) {
    const chunk = request.cookies.get(`${baseName}.${index}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return { value: null, chunkCount: 0 };
  }
  return { value: chunks.join(''), chunkCount: chunks.length };
}

function clearSupabaseCookie(response: NextResponse, baseName: string, maxChunks: number) {
  response.cookies.set({ name: baseName, value: '', path: '/', maxAge: 0 });
  const limit = Math.max(maxChunks, 4);
  for (let index = 0; index < limit; index += 1) {
    response.cookies.set({ name: `${baseName}.${index}`, value: '', path: '/', maxAge: 0 });
  }
}

function writeSupabaseCookie(response: NextResponse, baseName: string, rawValue: string, previousChunkCount: number) {
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

interface StoredSession {
  access_token: string;
  refresh_token: string | null;
  provider_token?: string | null;
  provider_refresh_token?: string | null;
}

function parseStoredSession(raw: string): StoredSession | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        access_token: typeof parsed[0] === 'string' ? parsed[0] : '',
        refresh_token: typeof parsed[1] === 'string' ? parsed[1] : null,
        provider_token: typeof parsed[2] === 'string' ? parsed[2] : null,
        provider_refresh_token: typeof parsed[3] === 'string' ? parsed[3] : null,
      };
    }
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const session = parsed as Record<string, unknown>;
      return {
        access_token: typeof session.access_token === 'string' ? session.access_token : '',
        refresh_token: typeof session.refresh_token === 'string' ? session.refresh_token : null,
        provider_token: typeof session.provider_token === 'string' ? session.provider_token : null,
        provider_refresh_token: typeof session.provider_refresh_token === 'string' ? session.provider_refresh_token : null,
      };
    }
  } catch (error) {
    console.error('[middleware] Failed to parse Supabase session cookie', error);
  }
  return null;
}

interface SupabaseUserResponse {
  status: number;
  user: null | {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
}

async function fetchSupabaseUser(supabaseUrl: string, supabaseAnonKey: string, accessToken: string): Promise<SupabaseUserResponse> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { status: res.status, user: null };
    }
    const data = (await res.json()) as SupabaseUserResponse['user'];
    return { status: res.status, user: data };
  } catch (error) {
    console.error('[middleware] fetchSupabaseUser failed', error);
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
  user: SupabaseUserResponse['user'];
}

async function refreshSupabaseSession(
  supabaseUrl: string,
  supabaseAnonKey: string,
  refreshToken: string,
): Promise<SupabaseTokenResponse | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[middleware] Supabase refresh failed', res.status);
      return null;
    }
    const data = (await res.json()) as SupabaseTokenResponse;
    return data;
  } catch (error) {
    console.error('[middleware] refreshSupabaseSession failed', error);
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
    return null;
  }
  const storedCookie = readSupabaseCookie(request, cookieName);
  if (!storedCookie.value) {
    debugAuth('middleware', 'No Supabase auth cookie present', { path: request.nextUrl.pathname });
    return null;
  }
  const storedSession = parseStoredSession(storedCookie.value);
  if (!storedSession || !storedSession.access_token) {
    debugAuth('middleware', 'Supabase cookie parse failed', { path: request.nextUrl.pathname });
    clearSupabaseCookie(response, cookieName, storedCookie.chunkCount);
    return null;
  }

  let userResult = await fetchSupabaseUser(supabaseUrl, supabaseAnonKey, storedSession.access_token);

  if (userResult.status === 401 && storedSession.refresh_token) {
    const refreshed = await refreshSupabaseSession(supabaseUrl, supabaseAnonKey, storedSession.refresh_token);
    if (!refreshed || !refreshed.access_token || !refreshed.user) {
      clearSupabaseCookie(response, cookieName, storedCookie.chunkCount);
      return null;
    }
    const sessionString = JSON.stringify([
      refreshed.access_token,
      refreshed.refresh_token,
      refreshed.provider_token ?? null,
      refreshed.provider_refresh_token ?? null,
    ]);
    writeSupabaseCookie(response, cookieName, sessionString, storedCookie.chunkCount);
    userResult = { status: 200, user: refreshed.user };
    storedSession.access_token = refreshed.access_token;
    storedSession.refresh_token = refreshed.refresh_token ?? storedSession.refresh_token;
  }

  if (userResult.status !== 200 || !userResult.user) {
    return null;
  }

  return {
    access_token: storedSession.access_token,
    refresh_token: storedSession.refresh_token,
    user: userResult.user,
  };
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
      return NextResponse.redirect(new URL('/login?reason=missing_supabase', request.url));
    }

    debugAuth('middleware', 'Evaluating request', {
      path: pathname,
      cookies: request.cookies.getAll().map((cookie) => cookie.name),
    });

    const session = await resolveSupabaseSession(request, response, supabaseUrl, supabaseAnonKey);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    const role = (session.user.user_metadata?.role as string | undefined) ?? 'buyer';
    debugAuth('middleware', 'Session detected', {
      path: pathname,
      role,
      email: session.user.email ?? null,
    });

    if (pathMatches(pathname, OPS_ONLY_PATHS) && role !== 'ops') {
      const redirectResponse = NextResponse.redirect(new URL('/not-authorized', request.url));
      mergeCookies(response, redirectResponse);
      return redirectResponse;
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
        const redirectResponse = NextResponse.redirect(inviteUrl);
        mergeCookies(response, redirectResponse);
        return redirectResponse;
      }
    } else if (isInvitePage && inviteSatisfied) {
      const nextParam = request.nextUrl.searchParams.get('next');
      const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : '/briefs';
      const redirectResponse = NextResponse.redirect(new URL(nextPath, request.url));
      mergeCookies(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  } catch (error) {
    console.error('[middleware] Unhandled failure', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    throw error;
  }
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\..*).*)'],
};
