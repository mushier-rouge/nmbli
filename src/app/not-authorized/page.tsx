import Link from 'next/link';

export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 px-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">You don&apos;t have access</h1>
        <p className="text-muted-foreground">
          This area is reserved for a different role. If you believe you should have access, contact the nmbli ops team.
        </p>
      </div>
      <Link className="text-sm font-semibold text-primary underline" href="/">
        Back to home
      </Link>
    </main>
  );
}
