#!/usr/bin/env tsx
/**
 * Test VehicleSelector with proper authentication using automation@nmbli.app
 */

import { chromium } from 'playwright';

const TEST_EMAIL = 'automation@nmbli.app';
const TEST_PASSWORD = 'Automation!123';

async function main() {
  console.log('\n=== Testing VehicleSelector with Authentication ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

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
    // Step 1: Navigate to login
    console.log('1️⃣  Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded\n');

    await page.waitForTimeout(1000);

    // Step 2: Click on Email & Password tab
    console.log('2️⃣  Clicking "Email & Password" tab...');
    await page.getByRole('tab', { name: /Email.*Password/i }).click();
    await page.waitForTimeout(500);
    console.log('✅ Password tab clicked\n');

    // Step 3: Fill in credentials
    console.log(`3️⃣  Entering email: ${TEST_EMAIL}...`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);

    console.log('4️⃣  Entering password...');
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.waitForTimeout(500);
    console.log('✅ Credentials entered\n');

    // Step 4: Submit form
    console.log('5️⃣  Submitting login form...');
    await page.locator('button[type="submit"]').first().click();

    // Wait for navigation to /briefs
    await page.waitForURL('**/briefs**', { timeout: 10000 });
    console.log('✅ Logged in successfully!\n');

    await page.waitForTimeout(1000);

    // Step 5: Navigate to /briefs/new
    console.log('6️⃣  Navigating to /briefs/new...');
    await page.goto('http://localhost:3000/briefs/new');
    await page.waitForLoadState('networkidle');
    console.log('✅ Create brief page loaded\n');

    await page.waitForTimeout(2000);

    // Step 6: Test VehicleSelector
    console.log('7️⃣  Clicking "Select makes..." button...');
    await page.locator('button:has-text("Select makes...")').click();
    await page.waitForTimeout(500);
    console.log('✅ Makes dropdown opened\n');

    console.log('8️⃣  Selecting Tesla...');
    await page.locator('text=Tesla').click();
    await page.waitForTimeout(1000);
    console.log('✅ Tesla selected\n');

    console.log('9️⃣  Looking for X icon to remove Tesla...');
    const teslaChip = page.locator('.bg-primary\\/10:has-text("Tesla")');
    const xIcon = teslaChip.locator('svg.lucide-x');

    console.log('🔟  Clicking X icon to remove Tesla...\n');
    await xIcon.click();

    await page.waitForTimeout(2000);

    // Results
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

    console.log('Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch(console.error);
