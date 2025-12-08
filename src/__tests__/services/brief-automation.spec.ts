import { describe, it, expect, vi, beforeEach } from 'vitest';
import { briefAutomation } from '@/lib/services/brief-automation';
import { discoverDealersForBrief, getDealersForBrief } from '@/lib/services/dealer-discovery';
import { gmailClient } from '@/lib/email/gmail';
import { twilioClient } from '@/lib/sms/twilio';
import { recordTimelineEvent } from '@/lib/services/timeline';
import { prisma } from '@/lib/prisma';

// Mock all dependencies
vi.mock('@/lib/services/dealer-discovery', () => ({
  discoverDealersForBrief: vi.fn(),
  getDealersForBrief: vi.fn(),
}));

vi.mock('@/lib/email/gmail', () => ({
  gmailClient: {
    sendEmail: vi.fn(),
  },
}));

vi.mock('@/lib/sms/twilio', () => ({
  twilioClient: {
    sendSMS: vi.fn(),
  },
}));

vi.mock('@/lib/services/timeline', () => ({
  recordTimelineEvent: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    brief: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dealerContact: {
      findFirst: vi.fn(),
    },
    dealership: {
      update: vi.fn(),
      findMany: vi.fn(), // Added mock for findMany based on implementation
    },
    emailMessage: {
      create: vi.fn(),
    },
    smsMessage: {
      create: vi.fn(),
    },
    skyvernRun: {
      create: vi.fn(),
      update: vi.fn(), // Added mock for update based on implementation
    },
  },
}));

describe('Brief Automation Orchestrator', () => {
  const orchestrator = briefAutomation;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GMAIL_FROM_EMAIL = 'contact@nmbli.com';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';
    // Default mocks
    vi.mocked(prisma.dealership.findMany).mockResolvedValue([]);
    vi.mocked(prisma.skyvernRun.create).mockResolvedValue({ id: 'run-1' } as any);
  });

  describe('processBrief', () => {
    it('should complete full automation workflow', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        trims: ['XSE'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'lease',
        timelinePreference: 'Within 2 weeks',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealers = [
        {
          id: 'dealer-1',
          name: 'Smith Toyota',
          email: 'sales@smithtoyota.com',
        },
      ];

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue(mockDealers as any);
      vi.mocked(prisma.dealership.findMany).mockResolvedValue(mockDealers as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(gmailClient.sendEmail).mockResolvedValue('msg-123');
      vi.mocked(prisma.emailMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(discoverDealersForBrief).toHaveBeenCalledWith('brief-123');
      expect(getDealersForBrief).toHaveBeenCalledWith('brief-123');
      expect(gmailClient.sendEmail).toHaveBeenCalled();
      expect(prisma.brief.update).toHaveBeenCalledWith({
        where: { id: 'brief-123' },
        data: { status: 'offers' },
      });
    });

    it('should record timeline events', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([]);
      vi.mocked(prisma.dealership.findMany).mockResolvedValue([]);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(recordTimelineEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          briefId: 'brief-123',
          type: expect.any(String),
          actor: 'system',
        })
      );
    });

    it('should throw error if brief not found', async () => {
      vi.mocked(prisma.brief.findUnique).mockResolvedValue(null);

      await expect(orchestrator.processBrief('invalid-id')).rejects.toThrow(
        'Brief invalid-id not found'
      );
    });

    it('should handle errors and record them', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        buyer: {},
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockRejectedValue(
        new Error('Discovery failed')
      );
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await expect(orchestrator.processBrief('brief-123')).rejects.toThrow(
        'Discovery failed'
      );

      expect(recordTimelineEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          briefId: 'brief-123',
          payload: expect.objectContaining({
            error: 'Discovery failed',
          }),
        })
      );
    });
  });

  describe('contactDealer - Email', () => {
    it('should send email to dealer with contact', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        trims: ['XSE'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'lease',
        timelinePreference: 'Within 2 weeks',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        email: 'sales@smithtoyota.com',
      };

      const mockContact = {
        id: 'contact-1',
        dealershipId: 'dealer-1',
        email: 'john@smithtoyota.com',
        phone: '555-1234',
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(mockContact as any);
      vi.mocked(gmailClient.sendEmail).mockResolvedValue('msg-123');
      vi.mocked(prisma.emailMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(gmailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@smithtoyota.com',
          subject: expect.stringContaining('Toyota Camry'),
        })
      );

      expect(prisma.emailMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          briefId: 'brief-123',
          dealershipId: 'dealer-1',
          contactId: 'contact-1',
          direction: 'outbound',
          toEmail: 'john@smithtoyota.com',
          gmailMessageId: 'msg-123',
        }),
      });
    });

    it('should send email to dealership email if no contact', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        email: 'info@smithtoyota.com',
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(gmailClient.sendEmail).mockResolvedValue('msg-123');
      vi.mocked(prisma.emailMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(gmailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'info@smithtoyota.com',
        })
      );

      expect(prisma.emailMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: null,
          toEmail: 'info@smithtoyota.com',
        }),
      });
    });
  });

  describe('contactDealer - SMS', () => {
    it('should send SMS if no email available', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Honda'],
        models: ['Accord'],
        zipcode: '60601',
        maxOTD: { toNumber: () => 30000 },
        paymentType: 'finance',
        timelinePreference: '1 month',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Johnson Honda',
        phone: '+15559876543',
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(twilioClient.sendSMS).mockResolvedValue('SM123');
      vi.mocked(prisma.smsMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(twilioClient.sendSMS).toHaveBeenCalledWith({
        to: '+15559876543',
        body: expect.stringContaining('Honda Accord'),
      });

      expect(prisma.smsMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          briefId: 'brief-123',
          dealershipId: 'dealer-1',
          direction: 'outbound',
          toNumber: '+15559876543',
          twilioSid: 'SM123',
        }),
      });
    });
  });

  describe('contactDealer - Skyvern', () => {
    it('should queue Skyvern if no contact info available', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['BMW'],
        models: ['X5'],
        zipcode: '10001',
        maxOTD: { toNumber: () => 70000 },
        paymentType: 'lease',
        timelinePreference: '2 weeks',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Manhattan BMW',
        make: 'BMW',
        // No email or phone
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.skyvernRun.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(prisma.skyvernRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          briefId: 'brief-123',
          dealershipId: 'dealer-1',
          status: 'pending',
          workflowId: 'quote-request-bmw',
        }),
      });

      expect(recordTimelineEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            dealer: 'Manhattan BMW',
            method: 'skyvern',
          }),
        })
      );
    });
  });

  describe('selectContactMethod', () => {
    it('should prioritize known contact email', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        email: 'info@smithtoyota.com',
        phone: '+15551234567',
      };

      const mockContact = {
        id: 'contact-1',
        dealershipId: 'dealer-1',
        email: 'john@smithtoyota.com',
        lastContactedAt: new Date(),
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(mockContact as any);
      vi.mocked(gmailClient.sendEmail).mockResolvedValue('msg-123');
      vi.mocked(prisma.emailMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      // Should use contact email, not dealership email
      expect(gmailClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@smithtoyota.com',
        })
      );
    });

    it('should use SMS as fallback to email', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        phone: '+15551234567',
        // No email
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(twilioClient.sendSMS).mockResolvedValue('SM123');
      vi.mocked(prisma.smsMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(twilioClient.sendSMS).toHaveBeenCalled();
      expect(gmailClient.sendEmail).not.toHaveBeenCalled();
    });

    it('should use Skyvern as last resort', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        make: 'Toyota',
        // No email or phone
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.skyvernRun.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(prisma.skyvernRun.create).toHaveBeenCalled();
      expect(gmailClient.sendEmail).not.toHaveBeenCalled();
      expect(twilioClient.sendSMS).not.toHaveBeenCalled();
    });
  });

  describe('updateLastContacted', () => {
    it('should update dealer last contacted timestamp', async () => {
      const mockBrief = {
        id: 'brief-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        maxOTD: { toNumber: () => 35000 },
        paymentType: 'cash',
        timelinePreference: 'ASAP',
        buyer: { email: 'buyer@example.com' },
      };

      const mockDealer = {
        id: 'dealer-1',
        name: 'Smith Toyota',
        email: 'sales@smithtoyota.com',
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(discoverDealersForBrief).mockResolvedValue(undefined);
      vi.mocked(getDealersForBrief).mockResolvedValue([mockDealer] as any);
      vi.mocked(prisma.dealerContact.findFirst).mockResolvedValue(null);
      vi.mocked(gmailClient.sendEmail).mockResolvedValue('msg-123');
      vi.mocked(prisma.emailMessage.create).mockResolvedValue({} as any);
      vi.mocked(prisma.dealership.update).mockResolvedValue({} as any);
      vi.mocked(prisma.brief.update).mockResolvedValue({} as any);
      vi.mocked(recordTimelineEvent).mockResolvedValue({} as any);

      await orchestrator.processBrief('brief-123');

      expect(prisma.dealership.update).toHaveBeenCalledWith({
        where: { id: 'dealer-1' },
        data: { lastContactedAt: expect.any(Date) },
      });
    });
  });
});
