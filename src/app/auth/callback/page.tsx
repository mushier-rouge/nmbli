'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { debugAuth } from '@/lib/debug';

function LoadingView() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Checking your link…</h1>
      <p className="text-sm text-muted-foreground">Please hold on while we verify your session.</p>
    </main>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParamsKey = searchParams?.toString() ?? '';

  useEffect(() => {
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
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) {
            throw new Error(setSessionError.message);
          }
        } else {
          const authCode = tokenHash ?? codeFromSearch ?? codeFromHash;
          if (!authCode) {
            throw new Error('Magic link is missing a token. Try requesting a new link.');
          }
          debugAuth('callback-client', 'Exchanging auth code', { authCode });
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            throw new Error(exchangeError.message);
          }
        }

        const response = await fetch('/api/auth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message ?? 'Failed to finalise login');
        }

        router.replace(next.startsWith('/') ? next : `/${next}`);
      } catch (err) {
        console.error('Auth callback failed', err);
        setError(err instanceof Error ? err.message : 'Something went wrong processing the magic link.');
      }
    }

    void completeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, searchParams, router]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Couldn&apos;t sign you in</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Request a fresh magic link or contact ops@nmbli.app if the issue persists.
        </p>
      </main>
    );
  }

  return <LoadingView />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
