'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { apiAcceptQuote, apiSendCounter } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface QuoteActionsProps {
  quoteId: string;
  status: string;
  addons: Array<{ name: string }>;
  disabled?: boolean;
}

export function QuoteActions({ quoteId, status, addons, disabled }: QuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [counterType, setCounterType] = useState<'remove_addons' | 'match_target'>('remove_addons');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(() => addons.map((addon) => addon.name));
  const [targetOTD, setTargetOTD] = useState('');

  const hasAddons = addons.length > 0;

  const isAcceptDisabled = status === 'accepted' || disabled || isPending;

  function handleAccept() {
    startTransition(async () => {
      try {
        await apiAcceptQuote(quoteId);
        toast.success('Quote accepted');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Failed to accept quote', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    });
  }

  const counterDisabled = isPending || (counterType === 'remove_addons' && selectedAddons.length === 0 && hasAddons);

  function onSubmitCounter() {
    startTransition(async () => {
      try {
        if (counterType === 'remove_addons') {
          await apiSendCounter(quoteId, { type: 'remove_addons', addonNames: selectedAddons });
        } else {
          const parsed = Number(targetOTD);
          if (Number.isNaN(parsed) || parsed <= 0) {
            toast.error('Enter a valid target OTD');
            return;
          }
          await apiSendCounter(quoteId, { type: 'match_target', targetOTD: parsed });
        }
        toast.success('Counter sent');
        setDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Failed to send counter', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="default" className="flex-1" disabled={isAcceptDisabled} onClick={handleAccept}>
        {status === 'accepted' ? 'Accepted' : 'Accept quote'}
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex-1" disabled={disabled || isPending}>
            Counter…
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a counter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={counterType} onValueChange={(value) => setCounterType(value as typeof counterType)}>
              <Label className="flex cursor-pointer flex-col gap-2 rounded-md border p-3 text-sm" data-state={counterType === 'remove_addons' ? 'checked' : undefined}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="remove_addons" /> Remove add-ons
                </div>
                <p className="text-xs text-muted-foreground">Ask the dealer to remove unapproved add-ons while keeping the OTD the same.</p>
              </Label>
              <Label className="flex cursor-pointer flex-col gap-2 rounded-md border p-3 text-sm" data-state={counterType === 'match_target' ? 'checked' : undefined}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="match_target" /> Match target OTD
                </div>
                <p className="text-xs text-muted-foreground">Set a clean target OTD with zero add-ons.</p>
              </Label>
            </RadioGroup>

            {counterType === 'remove_addons' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Add-ons to remove</p>
                <div className="space-y-1">
                  {addons.length === 0 && <p className="text-xs text-muted-foreground">No add-ons on this quote.</p>}
                  {addons.map((addon) => (
                    <label key={addon.name} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedAddons.includes(addon.name)}
                        onCheckedChange={(checked) => {
                          setSelectedAddons((prev) =>
                            checked ? [...prev, addon.name] : prev.filter((name) => name !== addon.name)
                          );
                        }}
                      />
                      {addon.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {counterType === 'match_target' && (
              <div className="space-y-2">
                <Label htmlFor="target-otd">Target OTD</Label>
                <Input
                  id="target-otd"
                  type="number"
                  min="0"
                  step="100"
                  value={targetOTD}
                  onChange={(event) => setTargetOTD(event.target.value)}
                  placeholder="48000"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button disabled={counterDisabled} onClick={onSubmitCounter}>
              Send counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
