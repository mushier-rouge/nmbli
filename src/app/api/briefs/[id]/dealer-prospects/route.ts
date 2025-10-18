import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { canAccessBrief } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { discoverDealerProspects } from '@/lib/services/dealer-prospects';
import { dealerProspectSearchSchema } from '@/lib/validation/dealer-prospect';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['buyer', 'ops']);
    const { id } = await params;

    const brief = await prisma.brief.findUnique({
      where: { id },
      select: { buyerId: true, zipcode: true, makes: true },
    });

    if (!brief) {
      return NextResponse.json({ message: 'Brief not found' }, { status: 404 });
    }

    if (!canAccessBrief(session, brief.buyerId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const raw = await request.json().catch(() => ({}));
    const brandsInput = Array.isArray(raw.brands)
      ? raw.brands
      : typeof raw.brands === 'string'
        ? raw.brands.split(',').map((item: string) => item.trim()).filter(Boolean)
        : [];

    const parsed = dealerProspectSearchSchema.parse({
      zip: raw.zip ?? brief.zipcode,
      driveHours: raw.driveHours,
      limit: raw.limit,
      additionalContext: raw.additionalContext,
      brands: brandsInput.length ? brandsInput : brief.makes,
    });

    const result = await discoverDealerProspects({
      briefId: id,
      driveHours: parsed.driveHours,
      brands: parsed.brands,
      zip: parsed.zip,
      limit: parsed.limit,
      additionalContext: parsed.additionalContext,
    });

    return NextResponse.json({
      prospects: result.prospects,
      created: result.created,
      updated: result.updated,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to search dealers';
    return NextResponse.json({ message }, { status: 400 });
  }
}
