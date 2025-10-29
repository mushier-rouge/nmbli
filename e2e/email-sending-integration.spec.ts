import { test, expect } from '@playwright/test';

/**
 * Integration test for email sending functionality
 * Tests that emails are actually sent to the test email address
 */

test.describe('Email Sending Integration Test', () => {

  test('should successfully send quote request emails to dealers', async ({ request, page }) => {
    console.log('\n🧪 Starting Email Sending Integration Test...\n');

    // Use automation test user email (from .env.local)
    const testUserEmail = 'automation@nmbli.app';

    // Step 1: Login as automation test user
    console.log('Step 1: Logging in...');
    await page.goto('/login');
    await page.fill('input[type="email"]', testUserEmail);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Step 2: Navigate to create brief page
    console.log('Step 2: Creating brief...');
    await page.goto('/briefs/new');

    // Fill out the brief form
    await page.fill('input[name="makes"]', 'Mazda');
    await page.fill('input[name="models"]', 'CX-90');
    await page.fill('input[name="zipcode"]', '95126');
    await page.fill('input[name="maxOTD"]', '50000');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect to brief detail page
    await page.waitForURL(/\/briefs\/[^/]+$/);

    // Extract brief ID from URL
    const url = page.url();
    const briefId = url.split('/briefs/')[1];
    console.log(`✓ Brief created with ID: ${briefId}\n`);

    // Step 3: Call the send-quotes API directly
    console.log('Step 3: Calling send-quotes API...');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/briefs/${briefId}/send-quotes`;

    const response = await request.post(apiUrl);
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
  });

  test('should handle webhook correctly', async ({ request }) => {
    console.log('\n🧪 Testing Inbound Email Webhook...\n');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/emails/inbound`;

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
    const response = await request.post(webhookUrl, {
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
