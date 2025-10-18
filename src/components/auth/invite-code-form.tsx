'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  code: z.string().min(3, 'Invite code must be at least 3 characters'),
});

interface InviteCodeFormProps {
  nextPath?: string | null;
}

export function InviteCodeForm({ nextPath }: InviteCodeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const redirectTo = useCallback(() => {
    if (nextPath && nextPath.startsWith('/')) {
      router.replace(nextPath);
    } else {
      router.replace('/briefs');
    }
  }, [nextPath, router]);

  const onSubmit = useCallback(
    (values: z.infer<typeof schema>) => {
      setServerError(null);
      startTransition(async () => {
        try {
          const response = await fetch('/api/dev-invite/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: values.code.trim() }),
          });

          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const message = body.message ?? 'Invite code was not accepted yet.';
            setServerError(message);
            toast.error('Could not verify invite', { description: message });
            return;
          }

          toast.success('Invite accepted', {
            description: 'Welcome aboard! Redirecting you to your briefs.',
          });
          redirectTo();
        } catch (error) {
          console.error(error);
          const message = 'We could not verify that invite code. Please try again.';
          setServerError(message);
          toast.error('Could not verify invite', { description: message });
        }
      });
    },
    [redirectTo],
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite code</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="one-time-code" placeholder="e.g. NMBLI-ALPHA" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Verifying…' : 'Continue'}
        </Button>
      </form>
    </Form>
  );
}
