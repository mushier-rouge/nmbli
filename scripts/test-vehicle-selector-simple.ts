#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  console.log('\n=== Testing VehicleSelector for React Error #185 ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.error('\n🔴 PAGE ERROR:', error.message);
    errors.push(error.message);
  });

  try {
    console.log('1️⃣  Navigating to /test-vehicle-selector...');
    await page.goto('http://localhost:3000/test-vehicle-selector');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded\n');

    await page.waitForTimeout(1000);

    console.log('2️⃣  Clicking "Select makes..." button...');
    await page.locator('button:has-text("Select makes...")').click();
    await page.waitForTimeout(500);
    console.log('✅ Dropdown opened\n');

    console.log('3️⃣  Clicking Tesla...');
    await page.locator('text=Tesla').click();
    await page.waitForTimeout(1000);
    console.log('✅ Tesla selected\n');

    console.log('4️⃣  Looking for X icon to remove Tesla...');
    // The X icon should be in the .bg-primary/10 div with Tesla text
    const teslaChip = page.locator('.bg-primary\\/10:has-text("Tesla")');
    const xIcon = teslaChip.locator('svg.lucide-x');

    console.log('5️⃣  Clicking X icon to remove Tesla...\n');
    await xIcon.click();

    await page.waitForTimeout(2000);

    console.log('\n=== RESULTS ===\n');
    if (errors.length > 0) {
      console.log('🔴 ERRORS DETECTED:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 200)}`);
      });

      const hasReactError = errors.some(err =>
        err.includes('Error #185') ||
        err.includes('Objects are not valid as a React child')
      );

      if (hasReactError) {
        console.log('\n✅ SUCCESS! Reproduced React Error #185\n');
      } else {
        console.log('\n⚠️  Other errors found\n');
      }
    } else {
      console.log('🟢 NO ERRORS! The component works correctly.\n');
    }

    console.log('Browser will stay open for 20 seconds...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch(console.error);
