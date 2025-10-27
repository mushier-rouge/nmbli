#!/usr/bin/env tsx
/**
 * Script to reproduce React Error #185 by interacting with VehicleSelector
 */

import { chromium } from 'playwright';

async function main() {
  console.log('\n=== Testing VehicleSelector for React Error #185 ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error('\n🔴 PAGE ERROR:', error.message);
    errors.push(error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  });

  try {
    console.log('1️⃣  Navigating to /test-vehicle-selector...');
    await page.goto('http://localhost:3000/test-vehicle-selector', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    await page.waitForTimeout(1000);

    console.log('2️⃣  Looking for Makes dropdown button...');
    const makesButton = page.getByRole('button', { name: /select makes/i }).or(
      page.getByRole('button', { name: /selected/i })
    ).first();

    console.log('3️⃣  Clicking Makes dropdown...');
    await makesButton.click();
    await page.waitForTimeout(500);

    console.log('4️⃣  Selecting Tesla...');
    await page.locator('text=Tesla').click();
    await page.waitForTimeout(500);

    console.log('5️⃣  Looking for X icon to remove make...');
    // The X icon is directly after the make name
    const removeButton = page.locator('.bg-primary\\/10 button').first().or(
      page.locator('svg.lucide-x').first()
    );

    console.log('6️⃣  Clicking X icon to remove Tesla...\n');
    await removeButton.click();

    await page.waitForTimeout(2000);

    console.log('\n=== RESULTS ===\n');
    if (errors.length > 0) {
      console.log('🔴 ERRORS DETECTED:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });

      const hasReactError = errors.some(err =>
        err.includes('Error #185') ||
        err.includes('Objects are not valid as a React child')
      );

      if (hasReactError) {
        console.log('\n✅ SUCCESS! Reproduced React Error #185\n');
      } else {
        console.log('\n⚠️  Errors found but not React Error #185\n');
      }
    } else {
      console.log('🟢 NO ERRORS! The component works correctly.\n');
    }

    console.log('Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch(console.error);
