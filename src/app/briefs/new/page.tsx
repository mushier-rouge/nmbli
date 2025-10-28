import Link from 'next/link';

import { BriefForm } from '@/components/brief/brief-form';
import { Button } from '@/components/ui/button';
import { getSessionContext } from '@/lib/auth/session';

export default async function NewBriefPage() {
  const session = await getSessionContext();
  if (!session || session.role !== 'buyer') {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Only buyers can create briefs</h1>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create a new brief</h1>
        <p className="text-base text-muted-foreground">Share your must-haves so we can invite dealers without the fluff.</p>
      </div>
      <BriefForm />
    </main>
  );
}
