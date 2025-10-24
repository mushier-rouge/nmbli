#!/usr/bin/env tsx
/**
 * Simple test for Gemini API dealer discovery
 *
 * Tests that the Gemini API can find dealerships
 * Usage: npm run test:gemini
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🚀 Testing Gemini API dealer discovery...\n');

  // Check if API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    console.error('Make sure it\'s set in .env.local');
    process.exit(1);
  }

  console.log('✅ GEMINI_API_KEY found\n');

  // Import after env vars are loaded
  const { findDealersInState } = await import('../src/lib/api/gemini');

  // Test finding Toyota dealers in Washington
  console.log('🔍 Finding Toyota dealers in Washington...');
  try {
    const dealers = await findDealersInState({
      make: 'Toyota',
      state: 'WA',
      count: 5,
    });

    console.log(`\n✅ Found ${dealers.length} dealerships:\n`);

    dealers.forEach((dealer, i) => {
      console.log(`${i + 1}. ${dealer.name}`);
      console.log(`   📍 ${dealer.address}`);
      console.log(`   🏙️  ${dealer.city}, ${dealer.state} ${dealer.zipcode}`);
      if (dealer.phone) console.log(`   📞 ${dealer.phone}`);
      if (dealer.email) console.log(`   ✉️  ${dealer.email}`);
      if (dealer.website) console.log(`   🌐 ${dealer.website}`);
      console.log('');
    });

    console.log('Summary:');
    console.log(`  Total dealers found: ${dealers.length}`);
    console.log(`  Dealers with phone: ${dealers.filter(d => d.phone).length}`);
    console.log(`  Dealers with email: ${dealers.filter(d => d.email).length}`);
    console.log(`  Dealers with website: ${dealers.filter(d => d.website).length}`);

    console.log('\n✅ Gemini API test successful!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

main();
