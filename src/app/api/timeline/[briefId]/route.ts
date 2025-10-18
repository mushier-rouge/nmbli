import { NextRequest, NextResponse } from 'next/server';

import { canAccessBrief } from '@/lib/auth/roles';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ briefId: string }> }) {
  try {
    const session = await requireSession(['buyer', 'ops']);
    const { briefId } = await params;

    const brief = await prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) {
      return NextResponse.json({ message: 'Brief not found' }, { status: 404 });
    }

    if (!canAccessBrief(session, brief.buyerId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const events = await prisma.timelineEvent.findMany({
      where: { briefId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Unable to load timeline' }, { status: 500 });
  }
}
