'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type SessionSummary = {
  email: string;
};

interface RootNavProps {
  session: SessionSummary | null;
}

const NAV_LINKS = [
  { href: '/briefs', label: 'Briefs' },
];

export function RootNav({ session }: RootNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG][RootNav] render', {
      pathname,
      hasSession: Boolean(session),
      sessionEmail: session?.email,
      isSigningOut,
      timestamp: new Date().toISOString(),
    });
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      console.log('[DEBUG][RootNav] sign out start', { timestamp: new Date().toISOString() });
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase.auth.signOut();
      } catch (clientError) {
        console.error('[DEBUG][RootNav] client signOut error', clientError);
      }
      const logoutResponse = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!logoutResponse.ok) {
        console.error('[DEBUG][RootNav] server logout returned non-OK', logoutResponse.status);
      }
      // Refresh to ensure server components pick up cleared session cookies
      router.refresh();
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm">
        <Link href="/" className="font-semibold">
          nmbli
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium ${pathname.startsWith(link.href) ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {link.label}
              </Link>
            ))}
            <span className="hidden text-xs text-muted-foreground sm:inline">{session.email}</span>
            <Button size="sm" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
