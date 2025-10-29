#!/usr/bin/env tsx
/**
 * End-to-end test: Create brief → Send quote requests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { prisma } from '../src/lib/prisma';

async function testQuoteFlow() {
  console.log('🧪 Testing Quote Request Flow (E2E)...\n');

  try {
    // Step 1: Create a test brief
    console.log('Step 1: Creating test brief...');

    const brief = await prisma.brief.create({
      data: {
        makes: ['Mazda'],
        models: ['CX-90'],
        zipcode: '95126',
        maxOTD: '50000',
        paymentType: 'finance',
        trims: ['Premium'],
        mustHaves: [],
        status: 'pending',
        userId: 'test-user-automation', // Using automation test user
        timelinePreference: 'Flexible - 1 to 2 months',
      },
    });

    console.log(`✓ Brief created: ${brief.id}\n`);

    // Step 2: Call send-quotes API
    console.log('Step 2: Sending quote requests via API...');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/briefs/${brief.id}/send-quotes`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`✓ API Response: ${response.status}\n`);

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('='.repeat(70));
      console.log('✅ SUCCESS! Quote requests sent');
      console.log('='.repeat(70));
      console.log(`Brief ID: ${brief.id}`);
      console.log(`Sent to ${data.sent.length} dealers:\n`);

      data.sent.forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.dealer}`);
        console.log(`   Email: ${result.email}`);
        console.log(`   Subject: ${result.subject}`);
        console.log();
      });

      if (data.failed && data.failed.length > 0) {
        console.log(`⚠️  ${data.failed.length} failed:`);
        data.failed.forEach((failure: any) => {
          console.log(`  - ${failure.dealer}: ${failure.reason}`);
        });
      }

      console.log('='.repeat(70));
      console.log('\n📬 Check your email: sanjay.devnani99@gmail.com');
      console.log('   You should receive 3 emails with dealer names as suffixes');
      console.log('   Example: sanjay.devnani99+stevenscreekmazda@gmail.com\n');
    } else {
      console.error('❌ Failed to send quote requests');
      console.error('Error:', data.error || 'Unknown error');
      console.error('Full response:', JSON.stringify(data, null, 2));
    }

    // Cleanup: Delete the test brief
    console.log('\nCleaning up test brief...');
    await prisma.brief.delete({ where: { id: brief.id } });
    console.log('✓ Test brief deleted');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testQuoteFlow();
