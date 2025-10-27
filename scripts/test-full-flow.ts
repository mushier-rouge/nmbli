#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  console.log('\n=== Testing Full Flow with automation2@nmbli.com ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const errors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();

    // Log ALL console messages
    if (text.includes('[VehicleSelector]') || type === 'error') {
      console.log(`[${type.toUpperCase()}] ${text}`);
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
    console.log('1️⃣  Going to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded\n');

    console.log('2️⃣  Clicking Email & Password tab...');
    await page.getByRole('tab', { name: /Email.*Password/i }).click();
    await page.waitForTimeout(500);
    console.log('✅ Tab clicked\n');

    console.log('3️⃣  Filling credentials...');
    await page.locator('input[type="email"]').first().fill('automation2@nmbli.com');
    await page.locator('input[type="password"]').first().fill('hE0fp6keXcnITdPAsoHZ!Aa9');
    await page.waitForTimeout(500);
    console.log('✅ Credentials entered\n');

    console.log('4️⃣  Submitting login...');
    await page.locator('button[type="submit"]').first().click();

    console.log('5️⃣  Waiting for redirect to /briefs...');
    await page.waitForURL('**/briefs**', { timeout: 10000 });
    console.log('✅ Logged in!\n');

    await page.waitForTimeout(1000);

    console.log('6️⃣  Navigating to /briefs/new...');
    await page.goto('http://localhost:3000/briefs/new');
    await page.waitForLoadState('networkidle');
    console.log('✅ Create brief page loaded\n');

    await page.waitForTimeout(2000);

    console.log('7️⃣  Clicking Makes dropdown...');
    await page.locator('button:has-text("Select makes...")').click();
    await page.waitForTimeout(500);
    console.log('✅ Dropdown opened\n');

    console.log('8️⃣  Selecting Tesla...');
    await page.locator('text=Tesla').click();
    await page.waitForTimeout(1000);
    console.log('✅ Tesla selected\n');

    console.log('9️⃣  Clicking X to remove Tesla...');
    const removeButton = page.locator('.bg-primary\\/10:has-text("Tesla") button').first();
    await removeButton.click();

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
        console.log('\n❌ React Error #185 REPRODUCED\n');
      }
    } else {
      console.log('✅ NO ERRORS! Fix is working correctly.\n');
    }

    console.log('Browser stays open for 20 seconds...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch(console.error);
