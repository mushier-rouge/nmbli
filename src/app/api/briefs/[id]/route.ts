import { NextRequest, NextResponse } from 'next/server';

import { canAccessBrief } from '@/lib/auth/roles';
import { requireSession } from '@/lib/auth/session';
import { getBriefDetail } from '@/lib/services/briefs';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['buyer', 'ops']);
    const { id } = await params;
    const brief = await getBriefDetail(id);

    if (!brief) {
      return NextResponse.json({ message: 'Brief not found' }, { status: 404 });
    }

    if (!canAccessBrief(session, brief.buyerId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ brief });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not fetch brief' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['buyer']);
    const { id } = await params;

    // Verify brief exists and belongs to user
    const brief = await prisma.brief.findUnique({
      where: { id },
      select: { buyerId: true },
    });

    if (!brief) {
      return NextResponse.json({ message: 'Brief not found' }, { status: 404 });
    }

    if (!canAccessBrief(session, brief.buyerId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Delete brief
    await prisma.brief.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brief:', error);
    return NextResponse.json({ message: 'Could not delete brief' }, { status: 500 });
  }
}
