'use client';

import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Minimal props as this is now a unified login form
type LoginFormProps = {
    className?: string;
    // ... any other props if needed
    [key: string]: unknown;
}

export function LoginForm(props: LoginFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
        ;
    const [email, setEmail] = React.useState('');

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault();
        setIsLoading(true);

        const supabase = getSupabaseBrowserClient();

        // Magic Link Login
        const { error } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase(),
            options: {
                emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });

        setIsLoading(false);

        if (error) {
            console.error(error);
            return toast.error(error.message || 'Something went wrong. Please try again.');
        }

        toast.success('Check your email for a login link! (v2)');
    }

    return (
        <div className="grid gap-6" {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="email">
                            Email
                        </Label>
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Button disabled={isLoading}>
                        {isLoading && (
                            <span className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign In with Email
                    </Button>
                </div>
            </form>
        </div>
    );
}
