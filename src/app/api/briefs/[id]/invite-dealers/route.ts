import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { getBriefDetail } from '@/lib/services/briefs';
import { createDealerInvites, getDealerById } from '@/lib/services/dealers';
import { sendDealerInviteEmail } from '@/lib/services/email';

const requestSchema = z.object({
  dealerIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(['ops']);
    const body = await request.json();
    const { dealerIds } = requestSchema.parse(body);

    const { id } = await params;
    const brief = await getBriefDetail(id);
    if (!brief) {
      return NextResponse.json({ message: 'Brief not found' }, { status: 404 });
    }

    const expiryDays = Number(process.env.INVITE_EXPIRY_DAYS ?? '3');
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const invites = await createDealerInvites({
      briefId: brief.id,
      dealerIds,
      createdById: session.userId,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await Promise.all(
      invites.map(async (invite) => {
        const dealer = await getDealerById(invite.dealerId);
        if (!dealer) return;

        await sendDealerInviteEmail({
          dealerEmail: dealer.contactEmail,
          dealerName: dealer.contactName || dealer.name,
          brief: {
            zipcode: brief.zipcode,
            paymentType: brief.paymentType,
            maxOTD: `$${brief.maxOTD.toNumber().toLocaleString()}`,
            makes: brief.makes,
            models: brief.models,
            mustHaves: brief.mustHaves,
          },
          link: `${appUrl}/d/${invite.magicLinkToken}`,
          expiresAt,
        });
      })
    );

    return NextResponse.json({ invites });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not send invites' }, { status: 400 });
  }
}
