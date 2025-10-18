'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

type DealerOption = {
  id: string;
  name: string;
  city: string;
  state: string;
  contactEmail: string;
};

interface InviteDealersFormProps {
  briefId: string;
  dealers: DealerOption[];
}

export function InviteDealersForm({ briefId, dealers }: InviteDealersFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleDealer(dealerId: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, dealerId] : prev.filter((id) => id !== dealerId)));
  }

  function handleSubmit() {
    if (selected.length === 0) {
      toast.error('Select at least one dealer');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/briefs/${briefId}/invite-dealers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealerIds: selected }),
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message ?? 'Unable to send invites');
        }

        toast.success('Invites queued');
        setSelected([]);
      } catch (error) {
        console.error(error);
        toast.error('Failed to send invites', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-56 space-y-3 overflow-auto rounded-md border p-3 text-sm">
        {dealers.map((dealer) => (
          <label key={dealer.id} className="flex items-start gap-3">
            <Checkbox
              checked={selected.includes(dealer.id)}
              onCheckedChange={(value) => toggleDealer(dealer.id, Boolean(value))}
            />
            <div>
              <p className="font-medium">{dealer.name}</p>
              <p className="text-xs text-muted-foreground">
                {dealer.city}, {dealer.state} · {dealer.contactEmail}
              </p>
            </div>
          </label>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Sending…' : 'Send invites'}
      </Button>
    </div>
  );
}
