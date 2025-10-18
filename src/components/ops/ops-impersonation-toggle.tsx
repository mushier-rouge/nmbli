'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DealerOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface Props {
  dealers: DealerOption[];
  activeDealerId: string | null;
}

export function OpsImpersonationToggle({ dealers, activeDealerId }: Props) {
  const [isPending, startTransition] = useTransition();

  function updateImpersonation(dealerId: string | null) {
    startTransition(async () => {
      try {
        const response = await fetch('/api/ops/impersonate', {
          method: dealerId ? 'POST' : 'DELETE',
          headers: dealerId ? { 'Content-Type': 'application/json' } : undefined,
          body: dealerId ? JSON.stringify({ dealerId }) : undefined,
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message ?? 'Unable to update impersonation');
        }

        toast.success(dealerId ? 'Impersonating dealer' : 'Impersonation cleared');
        window.location.reload();
      } catch (error) {
        console.error(error);
        toast.error('Failed to update impersonation', {
          description: error instanceof Error ? error.message : 'Try again later.',
        });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary">
      <span className="font-medium">Ops dev mode:</span>
      <Select
        defaultValue={activeDealerId ?? ''}
        onValueChange={(value) => updateImpersonation(value === '' ? null : value)}
        disabled={isPending}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select dealer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No impersonation</SelectItem>
          {dealers.map((dealer) => (
            <SelectItem key={dealer.id} value={dealer.id}>
              {dealer.name} — {dealer.city}, {dealer.state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {activeDealerId && (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => updateImpersonation(null)}>
          Clear
        </Button>
      )}
    </div>
  );
}
