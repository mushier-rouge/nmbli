#!/usr/bin/env tsx
/**
 * Test script to verify the send-quotes API endpoint
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSendQuotes() {
  console.log('🧪 Testing Quote Sending API Endpoint...\n');

  // Use a test brief ID (you can replace this with an actual brief ID)
  const testBriefId = 'test-brief-123';

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/briefs/${testBriefId}/send-quotes`;

    console.log(`Calling: POST ${url}\n`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response Status: ${response.status}\n`);

    const data = await response.json();

    console.log('='.repeat(70));
    console.log('RESPONSE DATA:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(70));

    if (response.ok && data.success) {
      console.log('\n✅ Quote requests sent successfully!');
      console.log(`\n📧 Sent to ${data.sent.length} dealers:`);
      data.sent.forEach((result: any) => {
        console.log(`  - ${result.dealer} (${result.email})`);
        console.log(`    Subject: ${result.subject}`);
      });

      if (data.failed && data.failed.length > 0) {
        console.log(`\n⚠️  ${data.failed.length} failed:`);
        data.failed.forEach((failure: any) => {
          console.log(`  - ${failure.dealer}: ${failure.reason}`);
        });
      }
    } else {
      console.error('\n❌ Failed to send quote requests');
      console.error('Error:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSendQuotes();
