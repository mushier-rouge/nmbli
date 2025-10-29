import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Webhook to receive inbound emails from dealers
 * Format: Resend inbound email webhook
 * https://resend.com/docs/api-reference/emails/webhook-event
 */

interface InboundEmailPayload {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  receivedAt?: string;
}

/**
 * Extract brief ID from email address
 * Example: quote-abc123@nmbli.com -> abc123
 */
function extractBriefId(email: string): string | null {
  const match = email.match(/quote-([^@]+)@nmbli\.com/);
  return match ? match[1] : null;
}

/**
 * Parse quote information from email body
 * Looks for common patterns like:
 * - "Out-the-Door Price: $50,700"
 * - "OTD: $50,700"
 * - "Total: $50,700"
 */
function parseQuoteFromEmail(text: string): {
  otdPrice?: number;
  msrp?: number;
  dealerDiscount?: number;
  taxesAndFees?: number;
} {
  const result: {
    otdPrice?: number;
    msrp?: number;
    dealerDiscount?: number;
    taxesAndFees?: number;
  } = {};

  // Try to find OTD price
  const otdPatterns = [
    /out[- ]?the[- ]?door\s*price[:\s]+\$?([\d,]+)/i,
    /out[- ]?the[- ]?door[:\s]+\$?([\d,]+)/i,
    /otd[:\s]+\$?([\d,]+)/i,
    /total[:\s]+\$?([\d,]+)/i,
  ];

  for (const pattern of otdPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.otdPrice = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Try to find MSRP
  const msrpMatch = text.match(/msrp[:\s]+\$?([\d,]+)/i);
  if (msrpMatch) {
    result.msrp = parseInt(msrpMatch[1].replace(/,/g, ''));
  }

  // Try to find dealer discount
  const discountMatch = text.match(/dealer[- ]?discount[:\s]+[-]?\$?([\d,]+)/i);
  if (discountMatch) {
    result.dealerDiscount = parseInt(discountMatch[1].replace(/,/g, ''));
  }

  // Try to find taxes and fees
  const taxesMatch = text.match(/taxes?[- ]?(?:and|&)?[- ]?fees?[:\s]+[+]?\$?([\d,]+)/i);
  if (taxesMatch) {
    result.taxesAndFees = parseInt(taxesMatch[1].replace(/,/g, ''));
  }

  return result;
}

/**
 * Extract dealer name from email address or email content
 */
function extractDealerName(from: string, subject: string): string {
  // Try to extract from email address
  const emailMatch = from.match(/([^@<]+)@/);
  if (emailMatch) {
    const name = emailMatch[1].replace(/[._-]/g, ' ').trim();
    // Clean up common patterns
    if (name && !name.includes('sales') && !name.includes('noreply')) {
      return name;
    }
  }

  // Try to extract from subject line
  const subjectMatch = subject.match(/(?:from|regards from)\s+([^-]+)/i);
  if (subjectMatch) {
    return subjectMatch[1].trim();
  }

  // Fallback: use the email address
  return from;
}

export async function POST(request: NextRequest) {
  try {
    const payload: InboundEmailPayload = await request.json();

    console.log('📨 Inbound email received:', {
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      receivedAt: payload.receivedAt || new Date().toISOString(),
    });

    // Extract brief ID from recipient address
    const briefId = extractBriefId(payload.to);
    if (!briefId) {
      console.error('Could not extract brief ID from:', payload.to);
      return NextResponse.json(
        { error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }

    // Parse email body for quote information
    const emailBody = payload.text || payload.html || '';
    const quoteData = parseQuoteFromEmail(emailBody);
    const dealerName = extractDealerName(payload.from, payload.subject);

    console.log('✓ Parsed quote data:', {
      briefId,
      dealerName,
      from: payload.from,
      quote: quoteData,
    });

    // Store the parsed data (for now just log it)
    // In production, this would be stored in database
    const responseData = {
      success: true,
      parsed: true,
      briefId,
      quote: {
        dealerName,
        dealerEmail: payload.from,
        receivedAt: payload.receivedAt || new Date().toISOString(),
        subject: payload.subject,
        ...quoteData,
      },
      rawEmail: {
        to: payload.to,
        from: payload.from,
        subject: payload.subject,
      },
    };

    console.log('💾 Quote data ready for storage:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error processing inbound email:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
