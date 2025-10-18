'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PublishQuoteButtonProps {
  quoteId: string;
}

export function PublishQuoteButton({ quoteId }: PublishQuoteButtonProps) {
  const router = useRouter();
  const [confidence, setConfidence] = useState('0.8');
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/ops/quotes/${quoteId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confidence: Number(confidence) }),
        });
        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message ?? 'Unable to publish quote');
        }
        toast.success('Quote published');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Failed to publish quote', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        max="1"
        step="0.05"
        value={confidence}
        onChange={(event) => setConfidence(event.target.value)}
        className="h-9 w-20 text-sm"
      />
      <Button size="sm" onClick={handlePublish} disabled={isPending}>
        Publish
      </Button>
    </div>
  );
}
