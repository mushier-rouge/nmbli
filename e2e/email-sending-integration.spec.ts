import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Integration test for email sending functionality
 * Tests that emails are actually sent to the test email address
 */

const RUN_FULL_E2E = process.env.RUN_FULL_E2E === '1';
test.skip(!RUN_FULL_E2E, 'Requires full e2e flow; run with RUN_FULL_E2E=1');

test.describe('Email Sending Integration Test', () => {
  test.beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'inherit' });
  });

  test('should successfully send quote request emails to dealers', async ({ page }) => {
    console.log('\n🧪 Starting Email Sending Integration Test...\n');

    // Step 1: Login as automation test user (sets cookies for subsequent API calls)
    console.log('Step 1: Logging in via password-login...');
    const loginResponse = await page.request.post('/api/auth/password-login', {
      data: { email: 'automation2@nmbli.app', password: 'hE0fp6keXcnITdPAsoHZ!Aa9' },
    });
    expect(loginResponse.status()).toBe(200);

    // Step 2: Create a brief through the API
    console.log('Step 2: Creating brief via API...');
    const createResponse = await page.request.post('/api/briefs', {
      data: {
        zipcode: '95126',
        paymentType: 'cash',
        maxOTD: 50000,
        makes: ['Mazda'],
        models: ['CX-90'],
        trims: [],
        colors: [],
        mustHaves: [],
        timelinePreference: 'ASAP',
      },
    });
    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    const briefId = createBody.brief.id as string;
    expect(briefId).toBeTruthy();
    console.log(`✓ Brief created with ID: ${briefId}\n`);

    // Step 3: Call the send-quotes API directly
    console.log('Step 3: Calling send-quotes API...');

    const response = await page.request.post(`/api/briefs/${briefId}/send-quotes`);
    const data = await response.json();

    console.log('Response status:', response.status());
    console.log('Response data:', JSON.stringify(data, null, 2));

    // Step 4: Verify the response
    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBeDefined();
    expect(data.sent.length).toBe(3); // Should have sent to 3 dealers

    // Verify each dealer received an email
    const dealers = ['Stevens Creek Mazda', 'Capitol Mazda', 'San Jose Mazda'];
    for (const dealer of dealers) {
      const sentRecord = data.sent.find((s: any) => s.dealer === dealer);
      expect(sentRecord).toBeDefined();
      expect(sentRecord.status).toBe('sent');
      expect(sentRecord.email).toContain('sanjay.devnani99+');
      expect(sentRecord.subject).toBeTruthy();
      console.log(`✓ ${dealer}: ${sentRecord.email}`);
    }

    console.log('\n✅ All emails sent successfully!');
    console.log('\n📬 Check your email inbox:');
    console.log('   sanjay.devnani99+stevenscreekmazda@gmail.com');
    console.log('   sanjay.devnani99+capitolmazda@gmail.com');
    console.log('   sanjay.devnani99+sanjosemazda@gmail.com');
    console.log(`\n   All emails should be FROM: quote-${briefId}@nmbli.com\n`);

    // Optional: Verify no failures
    expect(data.failed).toBeDefined();
    expect(data.failed.length).toBe(0);

    // Cleanup: delete the brief
    await page.request.delete(`/api/briefs/${briefId}`);
  });

  test('should handle webhook correctly', async ({ request }) => {
    console.log('\n🧪 Testing Inbound Email Webhook...\n');

    // Test payload simulating a dealer response
    const testPayload = {
      to: 'quote-integration-test@nmbli.com',
      from: 'sales@stevenscreekmazda.com',
      subject: 'Re: Quote Request - 2024 Mazda CX-90 Premium',
      text: `
        Thank you for your inquiry!

        MSRP: $48,500
        Dealer Discount: -$2,000
        Taxes & Fees: +$4,200
        Out-the-Door Price: $50,700
      `,
      receivedAt: new Date().toISOString(),
    };

    console.log('Sending test webhook payload...');
    const response = await request.post('/api/emails/inbound', {
      data: testPayload,
    });

    const data = await response.json();

    console.log('Webhook response:', JSON.stringify(data, null, 2));

    // Verify webhook processed correctly
    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.parsed).toBe(true);
    expect(data.briefId).toBe('integration-test');
    expect(data.quote.otdPrice).toBe(50700);
    expect(data.quote.dealerName).toBeTruthy();

    console.log('\n✅ Webhook test passed!');
  });
});
