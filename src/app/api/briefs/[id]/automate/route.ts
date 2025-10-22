import { NextRequest, NextResponse } from 'next/server';
import { briefAutomation } from '@/lib/services/brief-automation';
import { prisma } from '@/lib/prisma';

export const maxDuration = 300; // 5 minutes for dealer discovery

export async function POST(
  _request: NextRequest,
  context: RouteContext<'/api/briefs/[id]/automate'>
) {
  const { id: briefId } = await context.params;

  try {
    // Verify brief exists
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      select: { id: true, status: true, makes: true },
    });

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Start automation process
    console.log(`Starting automation for brief ${briefId}...`);

    await briefAutomation.processBrief(briefId);

    return NextResponse.json(
      {
        success: true,
        message: 'Automation completed successfully',
        briefId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Automation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
