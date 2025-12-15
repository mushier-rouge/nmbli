import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: NextRequest) {
    console.log('[API] /api/briefs POST Request received');
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.log('[API] /api/briefs Unauthorized: No session');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API] /api/briefs Session found for user:', session.user.id);

    try {
        // Ensure User record exists (fallback for users who logged in before OAuth fix)
        console.log('[API] /api/briefs Upserting user record...');
        await prisma.user.upsert({
            where: { id: session.user.id },
            update: {},
            create: {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
                role: 'buyer',
            },
        });
        console.log('[API] /api/briefs User record upserted.');

        const body = await request.json();
        console.log('[API] /api/briefs Request body parsed.');

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

        const briefData: any = {
            buyerId: session.user.id,
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
        };

        if (paymentPreferences) {
            briefData.paymentPreferences = paymentPreferences;
        }

        console.log('[API] /api/briefs Creating brief in database...');
        // Create the brief
        const brief = await prisma.brief.create({
            data: briefData,
        });
        console.log('[API] /api/briefs Brief created with ID:', brief.id);

        return NextResponse.json(brief);
    } catch (error) {
        console.error('[API] /api/briefs Error creating brief:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
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
