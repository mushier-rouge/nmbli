import { prisma } from '../prisma';
import { discoverDealersForBrief, getDealersForBrief } from './dealer-discovery';
import { gmailClient } from '../email/gmail';
import { twilioClient } from '../sms/twilio';
import { recordTimelineEvent } from './timeline';

export const briefAutomation = {
    /**
     * Process a brief by discovering dealers and contacting them
     */
    async processBrief(briefId: string) {
        console.log(`🤖 Processing brief ${briefId}...`);

        try {
            // Get the brief
            const brief = await prisma.brief.findUnique({
                where: { id: briefId },
                include: {
                    buyer: true,
                },
            });

            if (!brief) {
                throw new Error(`Brief ${briefId} not found`);
            }

            // Record automation start
            await recordTimelineEvent({
                briefId,
                type: 'automation_started',
                actor: 'system',
                payload: {
                    makes: brief.makes,
                    models: brief.models,
                },
            });

            // Discover dealers for this brief
            await discoverDealersForBrief(briefId);

            // Get discovered dealers
            const dealers = await getDealersForBrief(briefId);

            // Contact each dealer
            for (const dealer of dealers) {
                await this.contactDealer(brief, dealer);
            }

            // Update brief status to 'offers' after contacting dealers
            await prisma.brief.update({
                where: { id: briefId },
                data: { status: 'offers' },
            });

            await recordTimelineEvent({
                briefId,
                type: 'automation_completed',
                actor: 'system',
                payload: {
                    dealersContacted: dealers.length,
                },
            });

        } catch (error) {
            console.error(`❌ Error processing brief ${briefId}:`, error);

            await recordTimelineEvent({
                briefId,
                type: 'automation_error',
                actor: 'system',
                payload: {
                    error: error instanceof Error ? error.message : String(error),
                },
            });

            throw error;
        }
    },

    async contactDealer(brief: any, dealer: any) {
        // Check for known contact with email
        const contact = await prisma.dealerContact.findFirst({
            where: {
                dealershipId: dealer.id,
                email: { not: null },
            },
            orderBy: { lastContactedAt: 'desc' },
        });

        // Determine contact method and execute
        if (contact?.email) {
            // Use known contact email
            await this.sendEmail(brief, dealer, contact.email, contact.id);
        } else if (dealer.email) {
            // Use dealership email
            await this.sendEmail(brief, dealer, dealer.email, null);
        } else if (dealer.phone) {
            // Fallback to SMS
            await this.sendSMS(brief, dealer);
        } else {
            // Last resort: queue Skyvern
            await this.queueSkyvern(brief, dealer);
        }

        // Update dealer's last contacted timestamp
        await prisma.dealership.update({
            where: { id: dealer.id },
            data: { lastContactedAt: new Date() },
        });
    },

    async sendEmail(brief: any, dealer: any, toEmail: string, contactId: string | null) {
        const subject = `Quote Request: ${brief.makes.join(', ')} ${brief.models?.join(', ') || ''}`;
        const body = this.buildEmailBody(brief, dealer);

        const gmailMessageId = await gmailClient.sendEmail({
            to: toEmail,
            subject,
            body,
        });

        await prisma.emailMessage.create({
            data: {
                briefId: brief.id,
                dealershipId: dealer.id,
                contactId,
                direction: 'outbound',
                toEmail,
                subject,
                bodyText: body,
                gmailMessageId,
            },
        });

        await recordTimelineEvent({
            briefId: brief.id,
            type: 'dealer_contacted',
            actor: 'system',
            payload: {
                dealer: dealer.name,
                method: 'email',
                toEmail,
            },
        });
    },

    async sendSMS(brief: any, dealer: any) {
        const body = `Hi! Looking for a ${brief.makes.join(', ')} ${brief.models?.join(', ') || ''}. Max budget: $${brief.maxOTD.toNumber()}. Timeline: ${brief.timelinePreference}. Can you help?`;

        const twilioSid = await twilioClient.sendSMS({
            to: dealer.phone,
            body,
        });

        await prisma.smsMessage.create({
            data: {
                briefId: brief.id,
                dealershipId: dealer.id,
                direction: 'outbound',
                toNumber: dealer.phone,
                bodyText: body,
                twilioSid,
            },
        });

        await recordTimelineEvent({
            briefId: brief.id,
            type: 'dealer_contacted',
            actor: 'system',
            payload: {
                dealer: dealer.name,
                method: 'sms',
                toNumber: dealer.phone,
            },
        });
    },

    async queueSkyvern(brief: any, dealer: any) {
        const workflowId = `quote-request-${dealer.make?.toLowerCase() || 'generic'}`;

        await prisma.skyvernRun.create({
            data: {
                briefId: brief.id,
                dealershipId: dealer.id,
                status: 'pending',
                workflowId,
            },
        });

        await recordTimelineEvent({
            briefId: brief.id,
            type: 'dealer_contacted',
            actor: 'system',
            payload: {
                dealer: dealer.name,
                method: 'skyvern',
                workflowId,
            },
        });
    },

    buildEmailBody(brief: any, dealer: any): string {
        return `Hello,

I'm interested in purchasing a ${brief.makes.join(' or ')} ${brief.models?.join(' or ') || ''}.

Details:
- Budget: $${brief.maxOTD.toNumber()} max out-the-door
- Payment: ${brief.paymentType}
- Timeline: ${brief.timelinePreference}

Please let me know what you have available.

Thanks,
${brief.buyer.email}`;
    }
};
