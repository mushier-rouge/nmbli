import { prisma } from '@/lib/prisma';
import { discoverDealersForBrief, getDealersForBrief } from './dealer-discovery';
import { gmailClient } from '@/lib/email/gmail';
import { twilioClient } from '@/lib/sms/twilio';
import { generateQuoteRequestEmail } from '@/lib/email/templates/quote-request';
import { recordTimelineEvent } from './timeline';
import type { Prisma, Brief, Dealership } from '@/generated/prisma';

type PaymentPreference = {
  downPayment?: number | null;
  monthlyBudget?: number | null;
} & Record<string, Prisma.JsonValue>;

function isPaymentPreference(value: Prisma.JsonValue): value is PaymentPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, Prisma.JsonValue>;
  const downPayment = candidate.downPayment;
  const monthlyBudget = candidate.monthlyBudget;

  const downPaymentValid =
    downPayment === undefined || downPayment === null || typeof downPayment === 'number';
  const monthlyBudgetValid =
    monthlyBudget === undefined || monthlyBudget === null || typeof monthlyBudget === 'number';

  return downPaymentValid && monthlyBudgetValid;
}

interface ContactDetails {
  contact?: {
    id: string;
    email?: string;
    phone?: string;
  };
}

type EmailContactMethod = ContactDetails & {
  type: 'email';
  dealerEmail?: string;
};

type SmsContactMethod = ContactDetails & {
  type: 'sms';
  dealerPhone?: string;
};

type SkyvernContactMethod = {
  type: 'skyvern';
};

export type ContactMethod = 
  | EmailContactMethod
  | SmsContactMethod
  | SkyvernContactMethod;

type BriefWithBuyer = Prisma.BriefGetPayload<{ include: { buyer: true } }>;

function parsePaymentPreferences(value: Brief['paymentPreferences']): PaymentPreference[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return (value as Prisma.JsonValue[]).filter(isPaymentPreference);
}

export class BriefAutomationOrchestrator {
  async processBrief(briefId: string): Promise<void> {
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: { buyer: true },
    });

    if (!brief) {
      throw new Error(`Brief ${briefId} not found`);
    }

    try {
      // Step 1: Discover dealers
      await recordTimelineEvent({
        briefId,
        type: 'automation_started',
        actor: 'system',
        payload: { action: 'discovering_dealers' },
      });

      await discoverDealersForBrief(briefId);

      // Step 2: Get dealers to contact
      const dealers = await getDealersForBrief(briefId);

      await recordTimelineEvent({
        briefId,
        type: 'automation_started',
        actor: 'system',
        payload: { dealers_found: dealers.length },
      });

      // Step 3: Contact each dealer
      for (const dealer of dealers) {
        await this.contactDealer(brief, dealer);
      }

      // Step 4: Update brief status
      await prisma.brief.update({
        where: { id: briefId },
        data: { status: 'offers' },
      });
    } catch (error) {
      console.error(`Error processing brief ${briefId}:`, error);

      await recordTimelineEvent({
        briefId,
        type: 'automation_started',
        actor: 'system',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private async selectContactMethod(dealership: Dealership): Promise<ContactMethod> {
    // 1. Check for known dealer contact
    const contact = await prisma.dealerContact.findFirst({
      where: { dealershipId: dealership.id },
      orderBy: { lastContactedAt: 'desc' },
    });

    if (contact && contact.email) {
      return {
        type: 'email',
        contact: {
          id: contact.id,
          email: contact.email,
          phone: contact.phone || undefined,
        },
      };
    }

    // 2. Check dealership email
    if (dealership.email) {
      return {
        type: 'email',
        dealerEmail: dealership.email,
      };
    }

    // 3. Check dealership phone for SMS
    if (dealership.phone) {
      return {
        type: 'sms',
        dealerPhone: dealership.phone,
      };
    }

    // 4. Fall back to Skyvern
    return { type: 'skyvern' };
  }

  private async contactDealer(brief: BriefWithBuyer, dealership: Dealership): Promise<void> {
    const method = await this.selectContactMethod(dealership);

    switch (method.type) {
      case 'email':
        await this.sendEmailRequest(brief, dealership, method);
        break;
      case 'sms':
        await this.sendSMSRequest(brief, dealership, method);
        break;
      case 'skyvern':
        await this.queueSkyvern(brief, dealership);
        break;
    }

    // Update last contacted
    await prisma.dealership.update({
      where: { id: dealership.id },
      data: { lastContactedAt: new Date() },
    });
  }

  private async sendEmailRequest(
    brief: BriefWithBuyer,
    dealership: Dealership,
    method: EmailContactMethod
  ): Promise<void> {
    const to = method.contact?.email ?? method.dealerEmail;

    if (!to) {
      throw new Error('Email contact method missing destination address');
    }

    const [primaryPreference] = parsePaymentPreferences(brief.paymentPreferences);

    const emailContent = generateQuoteRequestEmail({
      dealerName: dealership.name,
      buyerName: brief.buyer?.email || 'A customer',
      make: brief.makes[0],
      model: brief.models[0],
      trim: brief.trims?.[0],
      zipcode: brief.zipcode,
      maxOTD: brief.maxOTD.toNumber(),
      timeline: brief.timelinePreference,
      paymentType: brief.paymentType,
      downPayment: primaryPreference?.downPayment ?? undefined,
      monthlyBudget: primaryPreference?.monthlyBudget ?? undefined,
    });

    const messageId = await gmailClient.sendEmail({
      to,
      subject: emailContent.subject,
      htmlBody: emailContent.html,
      textBody: emailContent.text,
    });

    // Record email
    await prisma.emailMessage.create({
      data: {
        briefId: brief.id,
        dealershipId: dealership.id,
        contactId: method.contact?.id ?? null,
        direction: 'outbound',
        toEmail: to,
        fromEmail: process.env.GMAIL_FROM_EMAIL || 'quotes@nmbli.com',
        subject: emailContent.subject,
        bodyHtml: emailContent.html,
        status: 'sent',
        gmailMessageId: messageId,
      },
    });

    await recordTimelineEvent({
      briefId: brief.id,
      type: 'dealer_contacted',
      actor: 'system',
      payload: {
        dealer: dealership.name,
        method: 'email',
        to,
      },
    });
  }

  private async sendSMSRequest(
    brief: BriefWithBuyer,
    dealership: Dealership,
    method: SmsContactMethod
  ): Promise<void> {
    const to = method.dealerPhone ?? method.contact?.phone;

    if (!to) {
      throw new Error('SMS contact method missing destination number');
    }

    const message = `Hi ${dealership.name}, I'm looking for a quote on a ${brief.makes[0]} ${brief.models[0]}. Max budget: $${brief.maxOTD.toNumber()}. Can you help? Reply via nmbli.com/d/${brief.id}`;

    const sid = await twilioClient.sendSMS({ to, body: message });

    // Record SMS
    await prisma.smsMessage.create({
      data: {
        briefId: brief.id,
        dealershipId: dealership.id,
        direction: 'outbound',
        toNumber: to,
        fromNumber: process.env.TWILIO_PHONE_NUMBER!,
        body: message,
        status: 'sent',
        costCents: 1, // Approximate cost
        twilioSid: sid,
      },
    });

    await recordTimelineEvent({
      briefId: brief.id,
      type: 'dealer_contacted',
      actor: 'system',
      payload: {
        dealer: dealership.name,
        method: 'sms',
        to,
      },
    });
  }

  private async queueSkyvern(brief: BriefWithBuyer, dealership: Dealership): Promise<void> {
    // Create Skyvern run record
    await prisma.skyvernRun.create({
      data: {
        briefId: brief.id,
        dealershipId: dealership.id,
        status: 'pending',
        workflowId: `quote-request-${dealership.make.toLowerCase()}`,
      },
    });

    await recordTimelineEvent({
      briefId: brief.id,
      type: 'dealer_contacted',
      actor: 'system',
      payload: {
        dealer: dealership.name,
        method: 'skyvern',
      },
    });

    // TODO: Actually call Skyvern API
    console.log(`Queued Skyvern for ${dealership.name}`);
  }
}

export const briefAutomation = new BriefAutomationOrchestrator();
