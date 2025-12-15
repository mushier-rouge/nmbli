import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { z } from 'zod';

const magicLinkSchema = z.object({
    email: z.string().email(),
    inviteCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
    const response = NextResponse.next({
        request: { headers: request.headers }
    });

    try {
        const body = await request.json();
        const { email, inviteCode } = magicLinkSchema.parse(body);

        const supabase = createSupabaseRouteClient(request, response);

        // Pass invite code as metadata if present
        const options: { emailRedirectTo: string; data?: { inviteCode: string } } = {
            emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=/briefs`,
        };

        if (inviteCode) {
            options.data = { inviteCode };
        }

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options,
        });

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
