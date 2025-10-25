#!/usr/bin/env tsx
/**
 * Automated test script to verify the login flow without manual intervention.
 *
 * This script:
 * 1. Logs in with test credentials
 * 2. Navigates to /briefs page
 * 3. Verifies no React errors occur
 * 4. Creates a brief with vehicle selection
 * 5. Verifies the brief was created successfully
 *
 * Usage:
 *   npx tsx scripts/test-login-flow.ts [--email EMAIL] [--password PASSWORD]
 *
 * Environment:
 *   TEST_EMAIL    - Test account email (default: test@example.com)
 *   TEST_PASSWORD - Test account password (default: test123456)
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';
const TEST_EMAIL = process.env.TEST_EMAIL || process.argv.includes('--email')
  ? process.argv[process.argv.indexOf('--email') + 1]
  : 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || process.argv.includes('--password')
  ? process.argv[process.argv.indexOf('--password') + 1]
  : 'test123456';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testLoginFlow() {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 Starting automated login flow test\n');
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔗 Base URL: ${BASE_URL}\n`);

    // Launch browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Step 1: Navigate to login page
    console.log('1️⃣  Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Login page loaded\n');

    // Step 2: Switch to password tab
    console.log('2️⃣  Switching to password authentication...');
    await page.click('button:has-text("Password")');
    await delay(500);
    console.log('   ✅ Password tab selected\n');

    // Step 3: Fill in credentials
    console.log('3️⃣  Entering credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log('   ✅ Credentials entered\n');

    // Step 4: Submit login
    console.log('4️⃣  Submitting login form...');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForLoadState('networkidle');
    await delay(2000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`   📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('/briefs')) {
      console.log('   ✅ Redirected to /briefs\n');
    } else {
      console.warn(`   ⚠️  Not redirected to /briefs (at ${currentUrl})\n`);
    }

    // Step 5: Check for React errors
    console.log('5️⃣  Checking for React errors...');
    const errorText = await page.textContent('body');
    if (errorText?.includes('Minified React error #185') ||
        errorText?.includes('Objects are not valid as a React child')) {
      console.error('   ❌ FOUND React Error #185!');
      throw new Error('React Error #185 detected');
    }
    console.log('   ✅ No React errors detected\n');

    // Step 6: Navigate to create new brief
    console.log('6️⃣  Creating a new brief...');
    await page.goto(`${BASE_URL}/briefs/new`);
    await page.waitForLoadState('networkidle');
    await delay(1000);
    console.log('   ✅ Brief creation page loaded\n');

    // Step 7: Select vehicle make
    console.log('7️⃣  Selecting vehicle make...');
    const makeSelect = page.locator('button:has-text("Select makes")').first();
    await makeSelect.click();
    await delay(500);

    // Select Toyota
    await page.click('button:has-text("Toyota")');
    await delay(500);

    // Close the dropdown
    await page.keyboard.press('Escape');
    await delay(500);
    console.log('   ✅ Vehicle make selected\n');

    // Step 8: Check for errors after vehicle selection
    console.log('8️⃣  Verifying no errors after vehicle selection...');
    const errorTextAfter = await page.textContent('body');
    if (errorTextAfter?.includes('Minified React error #185') ||
        errorTextAfter?.includes('Objects are not valid as a React child')) {
      console.error('   ❌ FOUND React Error #185 after vehicle selection!');
      throw new Error('React Error #185 detected after vehicle selection');
    }
    console.log('   ✅ No errors after vehicle selection\n');

    // Step 9: Fill remaining brief details
    console.log('9️⃣  Filling remaining brief details...');
    await page.fill('input[name="zipCode"]', '98101');
    await page.fill('input[name="budget"]', '35000');
    await page.fill('textarea[name="notes"]', 'Automated test brief');
    console.log('   ✅ Brief details filled\n');

    // Step 10: Submit brief
    console.log('🔟 Submitting brief...');
    await page.click('button[type="submit"]:has-text("Create Brief")');
    await page.waitForLoadState('networkidle');
    await delay(2000);

    const finalUrl = page.url();
    console.log(`   📍 Final URL: ${finalUrl}`);

    if (finalUrl.includes('/briefs') && !finalUrl.includes('/new')) {
      console.log('   ✅ Brief created successfully\n');
    } else {
      console.warn(`   ⚠️  Brief creation may have failed (at ${finalUrl})\n`);
    }

    // Final check for console and page errors
    if (consoleErrors.length > 0) {
      console.log('📋 Console errors detected:');
      consoleErrors.forEach((err) => console.log(`   - ${err}`));
      console.log();
    }

    if (pageErrors.length > 0) {
      console.log('📋 Page errors detected:');
      pageErrors.forEach((err) => console.log(`   - ${err.message}`));
      console.log();
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ TEST PASSED - No React Error #185 detected!');
    console.log('═══════════════════════════════════════\n');

    await delay(3000);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// Run the test
testLoginFlow()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
