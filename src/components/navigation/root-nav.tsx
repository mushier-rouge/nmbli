'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

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
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    });
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
            <Button size="sm" variant="outline" onClick={handleSignOut} disabled={isPending}>
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
