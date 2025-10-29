import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendQuoteRequestEmail } from '@/lib/services/email';

export const maxDuration = 60; // 1 minute for email sending

// Test mode configuration
const TEST_MODE = process.env.NODE_ENV !== 'production';
const TEST_EMAIL_BASE = 'sanjay.devnani99';

// Mock dealers for testing (3 dealers as per requirements)
const MOCK_DEALERS = [
  { name: 'Stevens Creek Mazda', city: 'San Jose', state: 'CA' },
  { name: 'Capitol Mazda', city: 'San Jose', state: 'CA' },
  { name: 'San Jose Mazda', city: 'San Jose', state: 'CA' },
];

interface RouteContext {
  params: Promise<Record<string, string>>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  const { id: briefId } = await context.params;

  try {
    // Verify brief exists
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      select: {
        id: true,
        status: true,
        makes: true,
        models: true,
        zipcode: true,
        maxOTD: true,
        paymentType: true,
      },
    });

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    console.log(`Sending quote requests for brief ${briefId}...`);

    // Extract vehicle details from brief
    const year = '2024'; // Default for now, can be added to brief later
    const make = brief.makes[0] || 'Unknown';
    const model = brief.models[0] || 'Unknown';

    // Send emails to dealers
    const results = [];
    const failed = [];

    for (const dealer of MOCK_DEALERS) {
      try {
        // In test mode, route to test email with dealer name suffix
        const dealerEmail = TEST_MODE
          ? `${TEST_EMAIL_BASE}+${dealer.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`
          : `sales@${dealer.name.toLowerCase().replace(/\s+/g, '')}.com`; // Would use real emails in production

        const result = await sendQuoteRequestEmail({
          briefId: brief.id,
          dealerName: dealer.name,
          dealerEmail,
          year,
          make,
          model,
          round: 'initial',
        });

        results.push({
          dealer: dealer.name,
          email: dealerEmail,
          status: 'sent',
          ...result,
        });

        console.log(`✓ Sent quote request to ${dealer.name}`);
      } catch (error) {
        console.error(`✗ Failed to send to ${dealer.name}:`, error);
        failed.push({
          dealer: dealer.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Quote requests sent to ${results.length} dealers`,
        briefId,
        sent: results,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending quote requests:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
