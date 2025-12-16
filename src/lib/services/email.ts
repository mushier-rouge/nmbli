import { Resend } from 'resend';

import {
  dealerInviteContent,
  dealerInviteSubject,
  counterEmailContent,
  counterEmailSubject,
  contractMismatchContent,
  contractMismatchSubject,
} from '@/lib/email/templates';
import type { CounterRequest } from '@/lib/validation/quote';
import { generateQuoteRequestEmail } from '@/lib/api/gemini';

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; emails will not be delivered');
    return null;
  }
  return new Resend(apiKey);
}

export async function sendDealerInviteEmail(params: {
  dealerEmail: string;
  dealerName: string;
  brief: {
    zipcode: string;
    paymentType: string;
    maxOTD: string;
    makes: string[];
    models: string[];
    mustHaves: string[];
  };
  link: string;
  expiresAt: Date;
}) {
  const resend = createResendClient();
  const { dealerEmail, dealerName, brief, link, expiresAt } = params;
  const content = dealerInviteContent({ dealerName, brief, link, expiresAt });

  if (!resend) {
    console.info('Dealer invite email skipped (missing EMAIL_API_KEY)', { dealerEmail, link });
    return;
  }

  await resend.emails.send({
    from: 'nmbli <contact@nmbli.com>',
    to: dealerEmail,
    subject: dealerInviteSubject(),
    html: content.html,
    text: content.text,
  });
}

export async function sendCounterEmail(params: {
  dealerEmail: string;
  dealerName: string;
  quoteSummary: string;
  counter: CounterRequest;
  link: string;
}) {
  const resend = createResendClient();
  const { dealerEmail, dealerName, quoteSummary, counter, link } = params;
  const content = counterEmailContent({ dealerName, quoteSummary, counter, link });

  if (!resend) {
    console.info('Counter email skipped (missing EMAIL_API_KEY)', { dealerEmail, link });
    return;
  }

  await resend.emails.send({
    from: 'nmbli <contact@nmbli.com>',
    to: dealerEmail,
    subject: counterEmailSubject(counter),
    html: content.html,
    text: content.text,
  });
}

export async function sendContractMismatchEmail(params: {
  dealerEmail: string;
  dealerName: string;
  quoteSummary: string;
  diffResults: Array<{ field: string; notes?: string }>;
  link: string;
}) {
  const resend = createResendClient();
  const { dealerEmail, dealerName, quoteSummary, diffResults, link } = params;
  const content = contractMismatchContent({ dealerName, quoteSummary, diffResults, link });

  if (!resend) {
    console.info('Contract mismatch email skipped (missing EMAIL_API_KEY)', { dealerEmail });
    return;
  }

  await resend.emails.send({
    from: 'nmbli <contact@nmbli.com>',
    to: dealerEmail,
    subject: contractMismatchSubject(),
    html: content.html,
    text: content.text,
  });
}

/**
 * Send automated quote request email to a dealer
 * Uses Gemini AI to compose the email content
 */
export async function sendQuoteRequestEmail(params: {
  briefId: string;
  dealerName: string;
  dealerEmail: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
  round?: 'initial' | 'counter' | 'final';
  lowestPrice?: number;
}) {
  const resend = createResendClient();

  const { briefId, dealerName, dealerEmail, year, make, model, trim, round = 'initial', lowestPrice } = params;

  const fromEmail = `quote-${briefId}@nmbli.com`;
  let emailContent: { subject: string; body: string };

  try {
    // Generate email content using Gemini (preferred)
    emailContent = await generateQuoteRequestEmail({
      briefId,
      year,
      make,
      model,
      trim,
      dealerName,
      replyToEmail: fromEmail,
      round,
      lowestPrice,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    // Local/dev fallback when GEMINI_API_KEY is missing.
    const vehicle = `${year} ${make} ${model}${trim ? ` ${trim}` : ''}`.trim();
    const subject =
      round === 'counter'
        ? `Counter Offer: ${vehicle}`
        : round === 'final'
          ? `Final Offer Request: ${vehicle}`
          : `Quote Request: ${vehicle}`;

    const bodyLines = [
      `Hello ${dealerName},`,
      '',
      `I'm interested in a quote for a ${vehicle}.`,
      '',
      'Could you please send your out-the-door price and a breakdown of MSRP, dealer discount, taxes, and fees?',
      '',
      `You can reply directly to this email: ${fromEmail}`,
      '',
      'Thanks,',
      'nmbli',
    ];

    if (round === 'final' && typeof lowestPrice === 'number') {
      bodyLines.splice(4, 0, `We currently have a lowest quote of $${lowestPrice.toLocaleString()}. Can you beat it?`, '');
    }

    emailContent = { subject, body: bodyLines.join('\n') };
  }

  console.log(`Sending ${round} quote request to ${dealerName} (${dealerEmail})`);

  if (!resend) {
    console.info('Quote request email skipped (missing RESEND_API_KEY)', {
      dealerEmail,
      briefId,
    });
  } else {
    await resend.emails.send({
      from: `nmbli <${fromEmail}>`,
      to: dealerEmail,
      subject: emailContent.subject,
      text: emailContent.body,
      html: emailContent.body.replace(/\n/g, '<br>'),
    });
  }

  return {
    success: true,
    dealerName,
    dealerEmail,
    subject: emailContent.subject,
  };
}
