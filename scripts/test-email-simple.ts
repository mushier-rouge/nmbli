/**
 * Simple test to verify email sending with an existing or new brief
 */

import { prisma } from '../src/lib/prisma';
const BASE_URL = 'http://localhost:3000';

async function testEmailSending() {
  console.log('\n🧪 Testing Email Sending\n');

  try {
    // Find an existing brief or create one directly via Prisma
    let brief = await prisma.brief.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!brief) {
      console.log('No existing briefs found. Creating one...');

      // Get or create a test user
      let user = await prisma.user.findFirst({
        where: { email: 'automation@nmbli.app' },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'automation@nmbli.app',
            role: 'buyer',
            name: 'Automation Test User',
          },
        });
        console.log('✓ Created test user');
      }

      brief = await prisma.brief.create({
        data: {
          buyerId: user.id,
          makes: ['Toyota'],
          models: ['RAV4'],
          zipcode: '98101',
          maxOTD: '45000',
          paymentType: 'finance',
          mustHaves: [],
          status: 'active',
        },
      });
      console.log(`✓ Created brief ${brief.id}`);
    } else {
      console.log(`✓ Using existing brief ${brief.id}`);
    }

    // Now call the send-quotes API
    console.log('\n📧 Sending quote requests...');
    const response = await fetch(`${BASE_URL}/api/briefs/${brief.id}/send-quotes`, {
      method: 'POST',
    });

    const data = await response.json();

    console.log('\n📬 Response:');
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('\n❌ FAILED:', data.error);
      process.exit(1);
    }

    if (data.sent && data.sent.length > 0) {
      console.log('\n✅ SUCCESS!');
      console.log(`Sent ${data.sent.length} emails:`);
      data.sent.forEach((email: any) => {
        console.log(`  ✓ ${email.dealer}: ${email.email}`);
      });
      console.log(`\n📬 Check inbox for emails FROM: quote-${brief.id}@nmbli.com`);
      process.exit(0);
    } else {
      console.error('\n❌ FAILED: No emails sent');
      if (data.failed && data.failed.length > 0) {
        console.error('Failures:', data.failed);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailSending();
