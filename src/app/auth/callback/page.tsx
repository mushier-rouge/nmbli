'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { debugAuth } from '@/lib/debug';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParamsKey = searchParams?.toString() ?? '';
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const search = new URLSearchParams(searchParamsKey);

    const next = search.get('next') ?? hashParams.get('next') ?? '/briefs';
    const codeFromSearch = search.get('code');
    const codeFromHash = hashParams.get('code');
    const tokenHash = hashParams.get('token_hash') ?? hashParams.get('token');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    async function completeAuth() {
      try {
        if (accessToken && refreshToken) {
          debugAuth('callback-client', 'Setting session via access token');
          const { error: setSessionError, data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) {
            console.error('setSession error:', setSessionError);
            throw new Error(setSessionError.message);
          }
          console.log('Session set successfully, user:', data.user?.email);

          // Wait a moment for cookies to be set
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          const authCode = tokenHash ?? codeFromSearch ?? codeFromHash;
          if (!authCode) {
            throw new Error('Magic link is missing a token. Try requesting a new link.');
          }

          // For PKCE flows (OAuth, magic link), exchange code directly on client
          // The client has the code verifier stored in cookies
          debugAuth('callback-client', 'Exchanging auth code on client', { authCode, next });
          const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            console.error('exchangeCodeForSession error:', exchangeError);
            throw new Error(exchangeError.message);
          }
          console.log('Code exchange successful, user:', data.user?.email);

          // Wait a moment for cookies to be set
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Verify session is actually available
        const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
        if (verifyError || !verifySession) {
          console.error('Session verification failed:', verifyError);
          throw new Error('Session was not established properly. Please try again.');
        }
        console.log('Session verified, calling /api/auth/complete');

        const response = await fetch('/api/auth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', // Ensure cookies are sent
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const errorMsg = body.message ?? 'Failed to finalise login';
          console.error('Auth complete failed:', { status: response.status, body, errorMsg });
          throw new Error(errorMsg);
        }

        console.log('Auth complete successful, redirecting to:', next);
        router.replace(next.startsWith('/') ? next : `/${next}`);
      } catch (err) {
        console.error('Auth callback failed', err);
        setError(err instanceof Error ? err.message : 'Something went wrong processing the magic link.');
      }
    }

    void completeAuth();
  }, [supabase, searchParamsKey, router]);

  if (error) {
    const friendlyError = error.includes('code verifier')
      ? 'The login link expired. Please start the sign-in again to get a fresh link.'
      : error;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Couldn&apos;t sign you in</h1>
        <p className="text-sm text-muted-foreground">{friendlyError}</p>
        <p className="text-xs text-muted-foreground">
          Request a fresh magic link or contact support if the issue persists.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Checking your link…</h1>
      <p className="text-sm text-muted-foreground">Please hold on while we verify your session.</p>
    </main>
  );
}
