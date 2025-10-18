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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const schema = z.object({
  email: z.string().email(),
  roleHint: z.enum(['buyer', 'dealer', 'ops']).default('buyer'),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      roleHint: 'buyer',
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

            <FormField
              control={form.control}
              name="roleHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-2"
                    >
                      {['buyer', 'dealer', 'ops'].map((role) => (
                        <label
                          key={role}
                          htmlFor={`role-${role}`}
                          className="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm capitalize shadow-sm transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary/10"
                          data-state={field.value === role ? 'checked' : 'unchecked'}
                        >
                          <RadioGroupItem id={`role-${role}`} value={role} className="sr-only" />
                          {role}
                        </label>
                      ))}
                    </RadioGroup>
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
