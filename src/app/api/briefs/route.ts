import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { sanitizeEnvValue } from '@/lib/utils/env';
import type { Prisma } from '@/generated/prisma';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function POST(request: NextRequest) {
    const start = Date.now();
    console.log('[API] /api/briefs POST Request received');
    const dbUrl = sanitizeEnvValue(process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL);
    if (dbUrl) {
        try {
            const host = new URL(dbUrl).host;
            console.log('[API] /api/briefs DB host', host);
        } catch {
            console.warn('[API] /api/briefs DB host parse failed');
        }
    }
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    console.log('[API] /api/briefs reading Supabase session...');
    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        8000,
        'supabase.auth.getSession'
    );

    if (sessionError) {
        console.error('[API] /api/briefs session error', sessionError.message);
        return NextResponse.json({ message: 'Unable to read session' }, { status: 500 });
    }

    if (!session) {
        console.log('[API] /api/briefs Unauthorized: No session');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API] /api/briefs Session found for user:', session.user.id);

    try {
        // Ensure User record exists (fallback for users who logged in before OAuth fix)
        console.log('[API] /api/briefs Upserting user record...');
        await withTimeout(
            prisma.user.upsert({
                where: { id: session.user.id },
                update: {},
                create: {
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
                    role: 'buyer',
                },
            }),
            8000,
            'prisma.user.upsert'
        );
        console.log('[API] /api/briefs User record upserted in', `${Date.now() - start}ms`);

        const body = await request.json();
        console.log('[API] /api/briefs Request body parsed.', Array.isArray(body) ? { type: 'array', length: body.length } : { keys: Object.keys(body ?? {}) });

        // Whitelist the fields to be inserted into the database
        const {
            zipcode,
            paymentType,
            maxOTD,
            makes,
            models,
            trims,
            colors,
            mustHaves,
            timelinePreference,
            paymentPreferences,
        } = body;

        const briefData: Prisma.BriefCreateInput = {
            buyer: { connect: { id: session.user.id } },
            status: 'sourcing', // Default status
            zipcode,
            paymentType,
            maxOTD,
            makes,
            models,
            trims,
            colors,
            mustHaves,
            timelinePreference,
            paymentPreferences: paymentPreferences ?? undefined,
        };

        console.log('[API] /api/briefs Creating brief in database...');
        // Create the brief
        const brief = await withTimeout(
            prisma.brief.create({
                data: briefData,
            }),
            8000,
            'prisma.brief.create'
        );
        console.log('[API] /api/briefs Brief created with ID:', brief.id, 'in', `${Date.now() - start}ms`);

        return NextResponse.json({ brief });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('[API] /api/briefs Error creating brief:', message);
        if (error instanceof Error && error.stack) {
            console.error('[API] /api/briefs Error stack:', error.stack);
        }
        return NextResponse.json({ message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const briefs = await prisma.brief.findMany({
            where: { buyerId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(briefs);
    } catch {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
