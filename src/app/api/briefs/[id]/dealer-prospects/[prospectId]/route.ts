import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { canAccessBrief } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { updateDealerProspect } from '@/lib/services/dealer-prospects';
import { dealerProspectStatusSchema } from '@/lib/validation/dealer-prospect';
import type { DealerProspectStatus } from '@/generated/prisma';

export async function PATCH(request: NextRequest, {
  params,
}: {
  params: Promise<{ id: string; prospectId: string }>;
}) {
  try {
    const session = await requireSession(['buyer', 'ops']);
    const { id, prospectId } = await params;

    const prospect = await prisma.dealerProspect.findUnique({
      where: { id: prospectId },
      include: { brief: { select: { buyerId: true } } },
    });

    if (!prospect || prospect.briefId !== id) {
      return NextResponse.json({ message: 'Prospect not found' }, { status: 404 });
    }

    if (!canAccessBrief(session, prospect.brief.buyerId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = dealerProspectStatusSchema.parse(body);

    const updated = await updateDealerProspect({
      prospectId,
      status: parsed.status as DealerProspectStatus,
      notes: parsed.notes ?? prospect.notes,
      markContacted: parsed.status === 'contacted',
    });

    return NextResponse.json({ prospect: updated });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to update prospect';
    return NextResponse.json({ message }, { status: 400 });
  }
}
