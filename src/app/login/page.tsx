import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { getSessionContext } from '@/lib/auth/session';

export default async function LoginPage() {
  const session = await getSessionContext();

  // If user is already logged in, redirect to homepage
  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Nmbli</h1>
        <p className="mt-2 text-sm text-muted-foreground">Compare car quotes with confidence.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-xs text-muted-foreground">
        Need help? <Link href="mailto:contact@nmbli.com" className="text-primary underline">Contact support</Link>
      </p>
    </main>
  );
}
