import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-6 text-center">
      <span className="rounded-full bg-primary/10 p-4 text-primary">
        <WifiOff className="h-10 w-10" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          OutTheDoor needs a connection to fetch live quotes. Reconnect to get back to the latest offers.
        </p>
      </div>
      <Link href="/" className="text-sm font-medium text-primary underline">
        Try again
      </Link>
    </main>
  );
}
