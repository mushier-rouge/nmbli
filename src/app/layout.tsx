import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';

import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { SonnerProvider } from '@/components/providers/sonner-provider';
import { OpsImpersonationBanner } from '@/components/ops/ops-impersonation-banner';
import { RootNav } from '@/components/navigation/root-nav';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Nmbli — Calm car buying with transparent OTD quotes',
  description:
    'Collect itemized out-the-door quotes from dealers, compare them with confidence, and tame contract surprises before you sign.',
  applicationName: 'Nmbli',
  keywords: ['car buying', 'out the door', 'quote comparison', 'dealer'],
  appleWebApp: {
    title: 'Nmbli',
    statusBarStyle: 'default',
  },
  manifest: '/manifest.webmanifest',
};

async function getInitialSession() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  } catch (error) {
    console.error('Failed to fetch Supabase session', error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getInitialSession();
  const navSession = session?.user
    ? { role: (session.user.user_metadata?.role as 'buyer' | 'dealer' | 'ops' | undefined) ?? 'buyer', email: session.user.email ?? '' }
    : null;

  return (
    <html lang="en" className="h-full">
      <body className={cn(geistSans.variable, geistMono.variable, 'min-h-full bg-background font-sans antialiased')}>
        <OpsImpersonationBanner />
        <RootNav session={navSession} />
        <SupabaseProvider initialSession={session}>
          <Suspense fallback={null}>
            <SonnerProvider />
          </Suspense>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
