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

function createResendClient() {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    console.warn('EMAIL_API_KEY not set; emails will not be delivered');
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
    from: 'nmbli Ops <ops@mail.nmbli.com>',
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
    from: 'nmbli Ops <ops@mail.nmbli.com>',
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
    from: 'nmbli Ops <ops@mail.nmbli.com>',
    to: dealerEmail,
    subject: contractMismatchSubject(),
    html: content.html,
    text: content.text,
  });
}
