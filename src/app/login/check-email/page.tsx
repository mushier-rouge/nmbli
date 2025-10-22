import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We just sent you a secure link. Open the email on this device to continue. The link expires in 5 minutes.
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Didn&apos;t get it? Check your spam folder or request another link.
          </p>
          <Link href="/login" className="text-primary underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
