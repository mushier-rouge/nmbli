'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type SessionSummary = {
  role: 'buyer' | 'dealer' | 'ops';
  email: string;
};

interface RootNavProps {
  session: SessionSummary | null;
}

const NAV_LINKS: Record<SessionSummary['role'], Array<{ href: string; label: string }>> = {
  buyer: [
    { href: '/briefs', label: 'Briefs' },
  ],
  dealer: [],
  ops: [
    { href: '/ops', label: 'Dashboard' },
  ],
};

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

  const links = session ? NAV_LINKS[session.role] ?? [] : [];

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm">
        <Link href="/" className="font-semibold">
          OutTheDoor
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            {links.map((link) => (
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
