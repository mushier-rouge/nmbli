import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Verify ownership
        const brief = await prisma.brief.findUnique({
            where: { id },
        });

        if (!brief) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        if (brief.buyerId !== session.user.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await prisma.brief.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting brief:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const brief = await prisma.brief.findUnique({
            where: { id },
            include: {
                quotes: true,
                timelineEvents: true,
            }
        });

        if (!brief) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        if (brief.buyerId !== session.user.id) {
            // Optionally allow ops roles to read
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(brief);
    } catch (error) {
        console.error('Error fetching brief:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
