import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ quoteId: string }> }
) {
    const { quoteId } = await context.params;
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify Ops role (simplistic check for now, can be enhanced)
    // Assuming ops role or specific email domain access
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || user.role !== 'ops') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const { confidence } = await request.json();

        const quote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'published',
                confidence: confidence,
                // Trigger any other side effects here (e.g., notify buyer)
            },
        });

        return NextResponse.json({ success: true, quote });
    } catch (error) {
        console.error('Failed to publish quote:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
