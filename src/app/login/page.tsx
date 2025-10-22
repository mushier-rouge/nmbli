import { Suspense } from 'react';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Nmbli</h1>
        <p className="mt-2 text-sm text-muted-foreground">Transparent out-the-door quotes, without the stress.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-xs text-muted-foreground">
        Need help? <Link href="mailto:ops@nmbli.app" className="text-primary underline">Contact ops</Link>
      </p>
    </main>
  );
}
