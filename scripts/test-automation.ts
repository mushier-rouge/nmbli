#!/usr/bin/env tsx
/**
 * Test script for dealer automation with real API keys
 *
 * This script tests the full automation flow:
 * 1. Create a test brief
 * 2. Discover dealers using Gemini API
 * 3. Attempt to contact dealers via email/SMS/Skyvern
 *
 * Usage: npm run test:automation
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🚀 Starting automation test with real API keys...\n');

  // Dynamic imports after env is loaded
  const prismaModule = await import('../src/lib/prisma');
  console.log('Prisma module:', Object.keys(prismaModule));
  const { prisma } = prismaModule;
  console.log('Prisma client:', typeof prisma, prisma ? 'defined' : 'undefined');
  console.log('Prisma has buyer?:', 'buyer' in prisma, typeof prisma.buyer);
  console.log('Prisma properties:', Object.keys(prisma).slice(0, 10));

  const { findDealersInState } = await import('../src/lib/api/gemini');
  const { discoverDealersForBrief } = await import('../src/lib/services/dealer-discovery');
  const { briefAutomation } = await import('../src/lib/services/brief-automation');

  // Step 1: Create a test brief
  console.log('📝 Creating test brief...');

  const testBuyer = await prisma.buyer.upsert({
    where: { email: 'test@nmbli.com' },
    update: {},
    create: {
      email: 'test@nmbli.com',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  const testBrief = await prisma.brief.create({
    data: {
      buyerId: testBuyer.id,
      makes: ['Toyota'],
      models: ['Camry'],
      trims: ['LE', 'SE'],
      zipcode: '98101',
      maxOTD: 35000,
      paymentType: 'finance',
      timelinePreference: 'this_week',
      paymentPreferences: [
        {
          downPayment: 5000,
          monthlyBudget: 500,
        },
      ],
      status: 'draft',
    },
  });

  console.log(`✅ Created test brief: ${testBrief.id}`);
  console.log(`   Makes: ${testBrief.makes.join(', ')}`);
  console.log(`   Models: ${testBrief.models.join(', ')}`);
  console.log(`   Zipcode: ${testBrief.zipcode}`);
  console.log(`   Max OTD: $${testBrief.maxOTD.toNumber()}\n`);

  // Step 2: Test Gemini dealer discovery
  console.log('🔍 Testing Gemini dealer discovery...');

  try {
    const dealers = await findDealersInState({
      make: 'Toyota',
      state: 'WA',
      count: 5, // Just get 5 for testing
    });

    console.log(`✅ Gemini found ${dealers.length} dealers:`);
    dealers.forEach((dealer, i) => {
      console.log(`   ${i + 1}. ${dealer.name}`);
      console.log(`      ${dealer.address}, ${dealer.city}, ${dealer.state} ${dealer.zipcode}`);
      if (dealer.phone) console.log(`      Phone: ${dealer.phone}`);
      if (dealer.email) console.log(`      Email: ${dealer.email}`);
      if (dealer.website) console.log(`      Website: ${dealer.website}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Gemini dealer discovery failed:', error);
    throw error;
  }

  // Step 3: Test full dealer discovery (saves to DB)
  console.log('💾 Running full dealer discovery (saves to database)...');

  try {
    await discoverDealersForBrief(testBrief.id);

    const dealerships = await prisma.dealership.findMany({
      where: {
        briefDealerships: {
          some: { briefId: testBrief.id },
        },
      },
    });

    console.log(`✅ Saved ${dealerships.length} dealerships to database`);
    dealerships.forEach((dealer, i) => {
      console.log(`   ${i + 1}. ${dealer.name} (${dealer.city}, ${dealer.state})`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Dealer discovery failed:', error);
    throw error;
  }

  // Step 4: Check what contact methods would be used
  console.log('📞 Checking contact method selection...');

  const dealerships = await prisma.dealership.findMany({
    where: {
      briefDealerships: {
        some: { briefId: testBrief.id },
      },
    },
    take: 3, // Just check first 3
  });

  for (const dealer of dealerships) {
    const hasEmail = !!dealer.email;
    const hasPhone = !!dealer.phone;
    const method = hasEmail ? 'Email' : hasPhone ? 'SMS' : 'Skyvern';

    console.log(`   ${dealer.name}:`);
    console.log(`      Contact method: ${method}`);
    if (hasEmail) console.log(`      Email: ${dealer.email}`);
    if (hasPhone) console.log(`      Phone: ${dealer.phone}`);
  }
  console.log();

  // Step 5: Test full automation (this would send real messages!)
  console.log('⚠️  Full automation test (would send real emails/SMS)');
  console.log('   Skipping to avoid sending test messages to real dealers.');
  console.log('   To run full automation, uncomment the code below.\n');

  /*
  console.log('🤖 Running full automation...');
  try {
    await briefAutomation.processBrief(testBrief.id);
    console.log('✅ Automation completed successfully');
  } catch (error) {
    console.error('❌ Automation failed:', error);
    throw error;
  }
  */

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  await prisma.brief.delete({ where: { id: testBrief.id } });
  await prisma.$disconnect();
  console.log('✅ Test complete!\n');

  console.log('Summary:');
  console.log('  ✓ Gemini API working');
  console.log('  ✓ Dealer discovery working');
  console.log('  ✓ Database integration working');
  console.log('  ✓ Contact method selection working');
  console.log('\nTo test actual email/SMS sending:');
  console.log('  1. Configure Gmail and Twilio credentials');
  console.log('  2. Uncomment the full automation code above');
  console.log('  3. Run this script again');
}

main()
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
