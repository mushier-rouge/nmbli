import { NextRequest, NextResponse } from 'next/server';

import { createBrief, listBuyerBriefs, listLatestBriefs } from '@/lib/services/briefs';
import { createBriefSchema } from '@/lib/validation/brief';
import { requireSession } from '@/lib/auth/session';
import { briefAutomation } from '@/lib/services/brief-automation';

export async function GET() {
  try {
    const session = await requireSession(['buyer', 'ops']);

    if (session.role === 'ops') {
      const briefs = await listLatestBriefs();
      return NextResponse.json({ briefs });
    }

    const briefs = await listBuyerBriefs(session.userId);
    return NextResponse.json({ briefs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(['buyer']);
    const body = await request.json();
    const parsed = createBriefSchema.parse(body);

    const brief = await createBrief({ buyerId: session.userId, input: parsed });

    // Trigger dealer discovery automation asynchronously (fire-and-forget)
    // This will discover dealers, contact them, and update brief status
    briefAutomation.processBrief(brief.id).catch((error) => {
      console.error(`[Brief ${brief.id}] Automation failed:`, error);
      // Don't fail the request - automation can be retried later
    });

    return NextResponse.json({ brief });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to create brief' }, { status: 500 });
  }
}
