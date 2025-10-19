import type { CounterRequest } from '@/lib/validation/quote';

interface BriefSummary {
  zipcode: string;
  paymentType: string;
  maxOTD: string;
  mustHaves: string[];
  makes: string[];
  models: string[];
}

interface DealerInviteTemplateInput {
  dealerName: string;
  brief: BriefSummary;
  link: string;
  expiresAt: Date;
}

export function dealerInviteSubject() {
  return `OutTheDoor | Quote request for your buyer`;
}

export function dealerInviteContent({ dealerName, brief, link, expiresAt }: DealerInviteTemplateInput) {
  const text = `Hi ${dealerName},\n\nWe\'re sourcing an itemized out-the-door quote for a buyer in ${brief.zipcode}.\nThey are shopping for ${brief.makes.join(', ')} ${brief.models.join(', ')} with a max budget of ${brief.maxOTD}.\n\nPlease submit your detailed quote (including doc fees, DMV, add-ons, incentives) using this secure link:\n${link}\n\nThe link expires ${expiresAt.toLocaleString()}.\n\nThank you,\nOutTheDoor Ops`;

  const html = `<!doctype html><html><body><p>Hi ${dealerName},</p><p>We\'re sourcing a transparent, itemized out-the-door quote for a buyer in <strong>${brief.zipcode}</strong>.</p><p>The buyer is interested in <strong>${brief.makes.join(', ')} ${brief.models.join(', ')}</strong> with a max budget of <strong>${brief.maxOTD}</strong>.</p><p>Use the secure link below to submit your quote with line items for doc fees, DMV, add-ons, and incentives.</p><p><a href="${link}" style="background:#111827;color:#fff;padding:12px 16px;border-radius:6px;display:inline-block;text-decoration:none;">Submit your quote</a></p><p>This link expires on ${expiresAt.toLocaleString()}.</p><p>Thanks,<br/>OutTheDoor Ops</p></body></html>`;

  return { text, html };
}

interface CounterEmailInput {
  dealerName: string;
  quoteSummary: string;
  counter: CounterRequest;
  link: string;
}

export function counterEmailSubject(counter: CounterRequest) {
  return counter.type === 'remove_addons' ? 'OutTheDoor | Remove add-ons requested' : 'OutTheDoor | Match target OTD requested';
}

export function counterEmailContent({ dealerName, quoteSummary, counter, link }: CounterEmailInput) {
  const intro = `Hi ${dealerName},\n\nThanks for your quote: ${quoteSummary}.`;
  let bodyText = '';
  let bodyHtml = '';

  if (counter.type === 'remove_addons') {
    bodyText = `The buyer would like the following add-ons removed while keeping the OTD the same:\n${counter.addonNames.map((name) => `- ${name}`).join('\n')}`;
    bodyHtml = `<p>The buyer would like the following add-ons removed while keeping the OTD the same:</p><ul>${counter.addonNames
      .map((name) => `<li>${name}</li>`)
      .join('')}</ul>`;
  } else {
    bodyText = `The buyer is targeting an OTD of ${counter.targetOTD.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })} with no add-ons.`;
    bodyHtml = `<p>The buyer is targeting an OTD of <strong>${counter.targetOTD.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })}</strong> with no add-ons.</p>`;
  }

  const ctaText = `${intro}\n\n${bodyText}\n\nPlease revise your quote using this link: ${link}\n\nThank you,\nOutTheDoor Ops`;

  const ctaHtml = `<!doctype html><html><body><p>Hi ${dealerName},</p><p>Thanks for your quote: ${quoteSummary}.</p>${bodyHtml}<p><a href="${link}" style="background:#111827;color:#fff;padding:12px 16px;border-radius:6px;display:inline-block;text-decoration:none;">Submit revised quote</a></p><p>Thank you,<br/>OutTheDoor Ops</p></body></html>`;

  return { text: ctaText, html: ctaHtml };
}

interface ContractMismatchEmailInput {
  dealerName: string;
  quoteSummary: string;
  diffResults: Array<{ field: string; notes?: string }>;
  link: string;
}

export function contractMismatchSubject() {
  return 'OutTheDoor | Contract needs updates before signing';
}

export function contractMismatchContent({ dealerName, quoteSummary, diffResults, link }: ContractMismatchEmailInput) {
  const text = `Hi ${dealerName},\n\nWe compared your contract against the accepted quote (${quoteSummary}) and found mismatches:\n${diffResults
    .map((result) => `- ${result.field}${result.notes ? `: ${result.notes}` : ''}`)
    .join('\n')}\n\nPlease correct these items and upload a revised contract: ${link}\n\nThanks,\nOutTheDoor Ops`;

  const html = `<!doctype html><html><body><p>Hi ${dealerName},</p><p>We compared your contract against the accepted quote (<strong>${quoteSummary}</strong>) and found the following mismatches:</p><ul>${diffResults
    .map((result) => `<li><strong>${result.field}</strong>${result.notes ? ` – ${result.notes}` : ''}</li>`)
    .join('')}</ul><p><a href="${link}" style="background:#111827;color:#fff;padding:12px 16px;border-radius:6px;display:inline-block;text-decoration:none;">Upload revised contract</a></p><p>Thanks,<br/>OutTheDoor Ops</p></body></html>`;

  return { text, html };
}
