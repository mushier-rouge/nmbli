'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email(),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsSubmitting(true);
    try {
      const redirectTo = params.get('redirectTo');
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          roleHint: 'buyer',
          redirectTo: redirectTo ? `${window.location.origin}${redirectTo}` : undefined,
        }),
      });

      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message ?? 'Failed to send magic link');
      }

      toast.success('Magic link sent', {
        description: `Check ${values.email} for a sign-in link.`,
      });
      router.push('/login/check-email');
    } catch (error) {
      console.error(error);
      toast.error('Could not send magic link', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in with a magic link</CardTitle>
        <CardDescription>Enter your email address and we&apos;ll send a secure link.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" placeholder="you@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending link…' : 'Email me a link'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
