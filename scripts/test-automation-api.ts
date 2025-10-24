#!/usr/bin/env tsx
/**
 * Test automation via API endpoint
 *
 * This tests the dealer automation by:
 * 1. Creating a brief through the web interface
 * 2. Triggering automation via API
 * 3. Checking results
 */

async function main() {
  console.log('🚀 Testing dealer automation via API...\n');

  const baseUrl = 'http://localhost:3000';

  // Check if dev server is running
  console.log('Checking if dev server is running...');
  try {
    const healthCheck = await fetch(baseUrl);
    if (!healthCheck.ok) {
      throw new Error('Dev server not responding');
    }
    console.log('✅ Dev server is running\n');
  } catch (error) {
    console.error('❌ Dev server is not running. Start it with: npm run dev');
    process.exit(1);
  }

  // Note: This test assumes you'll create a brief manually through the UI
  // Then pass the brief ID as argument
  const briefId = process.argv[2];

  if (!briefId) {
    console.log('Usage: npm run test:automation:api <brief-id>');
    console.log('\nTo test:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Create a brief at http://localhost:3000/briefs/new');
    console.log('3. Run this script with the brief ID');
    console.log('\nExample: npm run test:automation:api clxxx...');
    process.exit(0);
  }

  console.log(`Testing automation for brief: ${briefId}\n`);

  // Trigger automation
  console.log('🤖 Triggering automation...');
  try {
    const response = await fetch(`${baseUrl}/api/briefs/${briefId}/automate`, {
      method: 'POST',
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Automation failed:', result.error);
      process.exit(1);
    }

    console.log('✅ Automation completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error triggering automation:', error);
    process.exit(1);
  }
}

main();
