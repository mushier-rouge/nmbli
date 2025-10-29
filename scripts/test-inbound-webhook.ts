#!/usr/bin/env tsx
/**
 * Test script for inbound email webhook
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testInboundWebhook() {
  console.log('🧪 Testing Inbound Email Webhook...\n');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/emails/inbound`;

  // Test payload mimicking a dealer response
  const testPayload = {
    to: 'quote-test-123@nmbli.com',
    from: 'sales@stevenscreekmazda.com',
    subject: 'Re: Quote Request - 2024 Mazda CX-90 Premium',
    text: `
      Thank you for your inquiry!

      We can offer the 2024 Mazda CX-90 Premium for:

      MSRP: $48,500
      Dealer Discount: -$2,000
      Taxes & Fees: +$4,200
      ------------------------
      Out-the-Door Price: $50,700

      This is our best price. Let us know if you'd like to move forward!

      Best regards,
      Stevens Creek Mazda Sales Team
    `,
    receivedAt: new Date().toISOString(),
  };

  try {
    console.log('📤 Sending test email to webhook...\n');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('\n' + '='.repeat(70));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    console.log(`\nResponse Status: ${response.status}`);
    console.log('='.repeat(70));

    if (response.ok && data.success) {
      console.log('\n✅ Webhook processed successfully!\n');
      console.log('📊 Parsed Data:');
      console.log('='.repeat(70));
      console.log(`Brief ID: ${data.briefId}`);
      console.log(`Dealer: ${data.quote.dealerName}`);
      console.log(`Email: ${data.quote.dealerEmail}`);
      console.log(`Received: ${data.quote.receivedAt}`);
      console.log('\n💰 Quote Details:');
      if (data.quote.msrp) console.log(`  MSRP: $${data.quote.msrp.toLocaleString()}`);
      if (data.quote.dealerDiscount)
        console.log(`  Discount: -$${data.quote.dealerDiscount.toLocaleString()}`);
      if (data.quote.taxesAndFees)
        console.log(`  Taxes & Fees: +$${data.quote.taxesAndFees.toLocaleString()}`);
      if (data.quote.otdPrice) {
        console.log('  ' + '-'.repeat(30));
        console.log(`  OTD Price: $${data.quote.otdPrice.toLocaleString()}`);
      }
      console.log('='.repeat(70));
    } else {
      console.error('\n❌ Webhook failed');
      console.error('Error:', data.error || 'Unknown error');
      console.error('Full response:', JSON.stringify(data, null, 2));
    }

    // Test 2: Email without clear pricing
    console.log('\n\n' + '='.repeat(70));
    console.log('TEST 2: Email without clear pricing');
    console.log('='.repeat(70));

    const unclearPayload = {
      to: 'quote-test-456@nmbli.com',
      from: 'john@capitolmazda.com',
      subject: 'Re: Your Quote Request',
      text: `
        Hi there,

        Thanks for reaching out! I'd be happy to get you a quote.
        Can you give me a call at 408-555-1234 so we can discuss
        your needs in more detail?

        Thanks,
        John Smith
        Capitol Mazda
      `,
      receivedAt: new Date().toISOString(),
    };

    const response2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unclearPayload),
    });

    const data2 = await response2.json();

    if (response2.ok && data2.success) {
      console.log('\n✅ Webhook processed (no pricing found)');
      console.log(`Brief ID: ${data2.briefId}`);
      console.log(`Dealer: ${data2.quote.dealerName}`);
      console.log('Pricing: Not found in email');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ All tests completed!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testInboundWebhook();
