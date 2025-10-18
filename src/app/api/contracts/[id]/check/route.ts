import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { checkContractAgainstQuote } from '@/lib/services/contracts';
import { contractDiffInputSchema } from '@/lib/validation/contract';
import { prisma } from '@/lib/prisma';
import { sendContractMismatchEmail } from '@/lib/services/email';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(['ops']);
    const body = await request.json();
    const diffInput = contractDiffInputSchema.parse(body);
    const { id } = await params;

    const contract = await checkContractAgainstQuote({ contractId: id, input: diffInput });

    if (contract.status === 'mismatch') {
      const withRelations = await prisma.contract.findUnique({
        where: { id: contract.id },
        include: {
          quote: {
            include: {
              dealer: true,
              invite: true,
            },
          },
        },
      });

      if (withRelations?.quote?.dealer) {
        const diffResults = Array.isArray(contract.checks)
          ? (contract.checks as Array<{ field: string; notes?: string; pass: boolean }>).filter((item) => !item.pass)
          : [];

        await sendContractMismatchEmail({
          dealerEmail: withRelations.quote.dealer.contactEmail,
          dealerName: withRelations.quote.dealer.contactName || withRelations.quote.dealer.name,
          quoteSummary: `${withRelations.quote.year ?? ''} ${withRelations.quote.make ?? ''} ${withRelations.quote.model ?? ''}`.trim(),
          diffResults,
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/d/${withRelations.quote.invite?.magicLinkToken ?? ''}`,
        });
      }
    }

    return NextResponse.json({ contract });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to check contract' }, { status: 500 });
  }
}
