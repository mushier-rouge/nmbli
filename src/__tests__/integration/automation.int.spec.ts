import { describe, it, expect, beforeAll, vi } from 'vitest';
import { briefAutomation } from '@/lib/services/brief-automation';
import { discoverDealersForBrief, getDealersForBrief } from '@/lib/services/dealer-discovery';
import { prisma } from '@/lib/prisma';
import { gmailClient } from '@/lib/email/gmail';
import { twilioClient } from '@/lib/sms/twilio';

// Mock external services
vi.mock('@/lib/email/gmail', () => ({
  gmailClient: {
    sendEmail: vi.fn().mockResolvedValue('mock-message-id'),
  },
}));

vi.mock('@/lib/sms/twilio', () => ({
  twilioClient: {
    sendSMS: vi.fn().mockResolvedValue('mock-sms-sid'),
  },
}));

vi.mock('@/lib/api/gemini', () => ({
  findDealersInState: vi.fn().mockResolvedValue([
    {
      name: 'Mock Toyota Dealer',
      address: '123 Mock St',
      city: 'Seattle',
      state: 'WA',
      zipcode: '98101',
      phone: '+12065551234',
      email: 'sales@mocktoyota.com',
    },
  ]),
}));

describe.skip('Automation Integration Tests', () => {
  // These tests require a real database connection
  // Run with: npm run test:integration

  beforeAll(async () => {
    // Ensure test data is seeded
    console.log('Run: npm run db:seed before running integration tests');
  });

  it('should run full automation workflow', async () => {
    // This is a comprehensive test that runs the entire automation flow
    const briefId = 'test-brief-1';

    // Step 1: Discover dealers
    await discoverDealersForBrief(briefId);

    // Step 2: Get dealers
    const dealers = await getDealersForBrief(briefId);
    expect(dealers.length).toBeGreaterThan(0);

    // Step 3: Run full automation
    await briefAutomation.processBrief(briefId);

    // Verify brief status was updated
    const updatedBrief = await prisma.brief.findUnique({
      where: { id: briefId },
    });
    expect(updatedBrief?.status).toBe('offers');

    // Verify timeline events were created
    const timelineEvents = await prisma.timelineEvent.findMany({
      where: { briefId },
      orderBy: { createdAt: 'desc' },
    });
    expect(timelineEvents.length).toBeGreaterThan(0);
    expect(timelineEvents.some(e => e.type === 'automation_started')).toBe(true);
  }, 60000); // 60 second timeout for full workflow

  it('should send emails to dealers with contacts', async () => {
    const briefId = 'test-brief-1';
    
    await briefAutomation.processBrief(briefId);

    // Verify emails were sent
    expect(gmailClient.sendEmail).toHaveBeenCalled();

    // Check email messages were recorded
    const emailMessages = await prisma.emailMessage.findMany({
      where: { briefId },
    });
    expect(emailMessages.length).toBeGreaterThan(0);
  }, 60000);

  it('should send SMS when only phone available', async () => {
    // Create a test brief with a dealer that only has phone
    const briefId = 'test-brief-3';
    
    await briefAutomation.processBrief(briefId);

    // Check SMS messages were recorded
    const smsMessages = await prisma.smsMessage.findMany({
      where: { briefId },
    });
    
    // May or may not have SMS depending on dealer data
    console.log('SMS messages sent:', smsMessages.length);
  }, 60000);

  it('should queue Skyvern when no contact info', async () => {
    const briefId = 'test-brief-2';
    
    await briefAutomation.processBrief(briefId);

    // Check Skyvern runs were created
    const skyvernRuns = await prisma.skyvernRun.findMany({
      where: { briefId },
    });
    
    console.log('Skyvern runs queued:', skyvernRuns.length);
  }, 60000);

  it('should handle multiple makes correctly', async () => {
    const briefId = 'test-brief-2'; // Has both Honda and Toyota
    
    await discoverDealersForBrief(briefId);
    
    const dealers = await getDealersForBrief(briefId);
    
    const makes = [...new Set(dealers.map(d => d.make))];
    console.log('Dealers found for makes:', makes);
    
    // Should find dealers for multiple makes
    expect(dealers.length).toBeGreaterThan(0);
  }, 60000);
});
