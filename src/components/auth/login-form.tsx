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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emailSchema = z.object({
  email: z.string().email(),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().optional(),
});

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const automationEmail = process.env.NEXT_PUBLIC_AUTOMATION_TEST_USER_EMAIL;
const automationPassword = process.env.NEXT_PUBLIC_AUTOMATION_TEST_USER_PASSWORD;
const showAutomationHelper =
  process.env.NODE_ENV !== 'production' && Boolean(automationEmail && automationPassword);

type EmailCheckResult = {
  exists: boolean;
  needsInvite: boolean;
};

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [checkedEmail, setCheckedEmail] = useState<string>('');
  const router = useRouter();
  const params = useSearchParams();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const magicLinkForm = useForm<z.infer<typeof magicLinkSchema>>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: '',
      inviteCode: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onEmailCheck(values: z.infer<typeof emailSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to check email');
      }

      const result: EmailCheckResult = await response.json();
      setEmailCheckResult(result);
      setCheckedEmail(values.email);

      // If user exists, proceed directly to send magic link
      if (result.exists) {
        await sendMagicLink(values.email, undefined);
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not check email', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onJoinWaitlist() {
    if (!checkedEmail) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join waitlist');
      }

      toast.success('Added to waitlist!', {
        description: data.message,
      });

      // Reset form
      setEmailCheckResult(null);
      setCheckedEmail('');
      emailForm.reset();
    } catch (error) {
      console.error(error);
      toast.error('Could not join waitlist', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendMagicLink(email: string, inviteCode?: string) {
    const redirectTo = params.get('redirectTo');
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        inviteCode,
        roleHint: 'buyer',
        redirectTo: redirectTo ? `${window.location.origin}${redirectTo}` : undefined,
      }),
    });

    if (!response.ok) {
      const { message } = await response.json();
      throw new Error(message ?? 'Failed to send magic link');
    }

    toast.success('Magic link sent', {
      description: `Check ${email} for a sign-in link.`,
    });
    router.push('/login/check-email');
  }

  async function onInviteCodeSubmit(values: z.infer<typeof magicLinkSchema>) {
    if (!checkedEmail) return;

    setIsSubmitting(true);
    try {
      await sendMagicLink(checkedEmail, values.inviteCode);
    } catch (error) {
      console.error(error);
      toast.error('Could not send magic link', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message ?? 'Failed to sign in');
      }

      const redirectTo = params.get('redirectTo') || '/briefs';
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Could not sign in', {
        description: error instanceof Error ? error.message : 'Check your email and password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Choose your preferred sign-in method</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="magic-link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
            <TabsTrigger value="password">Email &amp; Password</TabsTrigger>
          </TabsList>

          <TabsContent value="magic-link">
            {!emailCheckResult ? (
              /* Step 1: Enter email */
              <Form {...emailForm}>
                <form className="space-y-4" onSubmit={emailForm.handleSubmit(onEmailCheck)}>
                  <FormField
                    control={emailForm.control}
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
                    {isSubmitting ? 'Checking…' : 'Continue'}
                  </Button>
                </form>
              </Form>
            ) : emailCheckResult.needsInvite ? (
              /* Step 2a: New user needs invite code */
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Signing up with: <span className="font-medium text-foreground">{checkedEmail}</span></p>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailCheckResult(null);
                      setCheckedEmail('');
                    }}
                    className="text-primary underline hover:no-underline"
                  >
                    Change email
                  </button>
                </div>

                <Form {...magicLinkForm}>
                  <form className="space-y-4" onSubmit={magicLinkForm.handleSubmit(onInviteCodeSubmit)}>
                    <FormField
                      control={magicLinkForm.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., testdrive" type="text" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Sending link…' : 'Send magic link'}
                    </Button>
                  </form>
                </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onJoinWaitlist}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining…' : 'Join waitlist'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Don&apos;t have an invite code? Join our waitlist and we&apos;ll email you one when available.
                </p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="password">
            <Form {...passwordForm}>
              <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <FormField
                  control={passwordForm.control}
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
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input autoComplete="current-password" placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </Form>
            {showAutomationHelper ? (
              <div className="mt-4 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Automation test user</p>
                <p className="mt-1">
                  Use these credentials when running local automation or Playwright flows:
                </p>
                <div className="mt-2 space-y-1 font-mono text-[11px]">
                  <p>Email: {automationEmail}</p>
                  <p>Password: {automationPassword}</p>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
