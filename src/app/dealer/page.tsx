export const dynamic = 'force-dynamic';

export default function DealerLandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Check your invite email</h1>
      <p className="text-sm text-muted-foreground">
        nmbli dealer quotes are accessed via secure magic links. Please open the latest email from ops@nmbli.app and use the provided link.
      </p>
    </main>
  );
}
