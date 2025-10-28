#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  console.log('\n=== Testing Full Brief Creation Flow ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const errors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();

    if (text.includes('[VehicleSelector]') || type === 'error') {
      console.log(`[${type.toUpperCase()}] ${text.substring(0, 200)}`);
    }

    if (type === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    console.error('\n🔴 PAGE ERROR:', error.message);
    errors.push(error.message);
  });

  try {
    // Step 1: Login
    console.log('1️⃣  Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded\n');

    console.log('2️⃣  Clicking Email & Password tab...');
    await page.getByRole('tab', { name: /Email.*Password/i }).click();
    await page.waitForTimeout(500);
    console.log('✅ Tab clicked\n');

    console.log('3️⃣  Filling credentials (using OLD password)...');
    await page.locator('input[type="email"]').first().fill('automation2@nmbli.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.waitForTimeout(500);
    console.log('✅ Credentials entered\n');

    console.log('4️⃣  Submitting login...');
    await page.locator('button[type="submit"]').first().click();

    console.log('5️⃣  Waiting for redirect to /briefs...');
    await page.waitForURL('**/briefs**', { timeout: 10000 });
    console.log('✅ Logged in!\n');

    await page.waitForTimeout(1000);

    // Step 2: Create New Brief
    console.log('6️⃣  Navigating to /briefs/new...');
    await page.goto('http://localhost:3000/briefs/new');
    await page.waitForLoadState('networkidle');
    console.log('✅ Create brief page loaded\n');

    await page.waitForTimeout(2000);

    // Step 3: Select Make (now single selection with radio buttons)
    console.log('7️⃣  Clicking Make dropdown...');
    await page.locator('button').filter({ hasText: /Select make|Tesla/i }).first().click();
    await page.waitForTimeout(500);
    console.log('✅ Make dropdown opened\n');

    console.log('8️⃣  Selecting Tesla...');
    await page.locator('label').filter({ hasText: 'Tesla' }).click();
    await page.waitForTimeout(500);
    // Close make dropdown by clicking elsewhere
    await page.locator('h1').click();
    await page.waitForTimeout(500);
    console.log('✅ Tesla selected\n');

    // Step 4: Select Model
    console.log('9️⃣  Clicking Model dropdown...');
    await page.locator('button:has-text("Select model")').or(
      page.locator('button:has-text("Model 3")')
    ).first().click();
    await page.waitForTimeout(500);
    console.log('✅ Model dropdown opened\n');

    console.log('🔟  Selecting "Other" for model...');
    await page.locator('label:has-text("Other")').first().click();
    await page.waitForTimeout(500);
    console.log('✅ "Other" selected\n');

    console.log('1️⃣1️⃣  Typing custom model name...');
    const customModelInput = page.locator('input[placeholder*="Specify model"]');
    await customModelInput.waitFor({ state: 'visible', timeout: 3000 });
    await customModelInput.fill('Custom Model X');
    await page.waitForTimeout(500);
    console.log('✅ Custom model entered\n');

    // Close model dropdown by clicking elsewhere
    await page.locator('h1').click();
    await page.waitForTimeout(500);

    // Step 5: Select Trim
    console.log('1️⃣2️⃣  Clicking Trim dropdown...');
    await page.locator('button').filter({ hasText: /select trim|Other/i }).first().click();
    await page.waitForTimeout(500);
    console.log('✅ Trim dropdown opened\n');

    console.log('1️⃣3️⃣  Selecting "Other" for trim...');
    // The trim "Other" option should be the only visible one now that model dropdown is closed
    await page.locator('label').filter({ hasText: 'Other' }).first().click();
    await page.waitForTimeout(1000);
    console.log('✅ "Other" selected\n');

    console.log('1️⃣4️⃣  Typing custom trim name...');
    const customTrimInput = page.locator('input[placeholder*="Specify trim"]');
    await customTrimInput.waitFor({ state: 'visible', timeout: 3000 });
    await customTrimInput.fill('Custom Performance Plus');
    await page.waitForTimeout(500);
    console.log('✅ Custom trim entered\n');

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
        console.log('\n❌ React Error #185 FOUND - FIX DID NOT WORK\n');
        process.exit(1);
      } else {
        console.log('\n⚠️  Other errors found\n');
        process.exit(1);
      }
    } else {
      console.log('✅ NO ERRORS! Full brief creation flow works correctly.\n');
    }

    console.log('Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
