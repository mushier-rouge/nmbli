import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: NextRequest) {
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

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

        // Create the brief
        const brief = await prisma.brief.create({
            data: briefData,
        });

        return NextResponse.json(brief);
    } catch (error) {
        console.error('Error creating brief:', error);
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
