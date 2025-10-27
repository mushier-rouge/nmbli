#!/usr/bin/env tsx
/**
 * Automated test to reproduce React Error #185 on /briefs page
 *
 * Usage:
 *   SITE_URL=https://nmbli.com TEST_USER_EMAIL=your@email.com npm run test:debug-briefs
 *
 * Or for local:
 *   SITE_URL=http://localhost:3000 TEST_USER_EMAIL=test@example.com npm run test:debug-briefs
 */

import { chromium } from 'playwright';

const SITE_URL = process.env.SITE_URL || 'https://nmbli.com';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

if (!TEST_USER_EMAIL) {
  console.error('ERROR: TEST_USER_EMAIL environment variable is required');
  console.error('Example: TEST_USER_EMAIL=your@email.com npm run test:debug-briefs');
  process.exit(1);
}

async function main() {
  console.log('\n=== React Error #185 Debug Tool ===');
  console.log(`Site: ${SITE_URL}`);
  console.log(`Test User: ${TEST_USER_EMAIL}`);
  console.log('=====================================\n');

  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs: Array<{ type: string; text: string; timestamp: number }> = [];
  const pageErrors: Array<{ message: string; stack?: string; timestamp: number }> = [];

  // Capture console
  page.on('console', (msg) => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
    };
    consoleLogs.push(entry);

    // Print important logs in real-time
    if (entry.type === 'error' || entry.text.includes('[SLOT') || entry.text.includes('[BUTTON')) {
      console.log(`[${entry.type.toUpperCase()}] ${entry.text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    const entry = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    };
    pageErrors.push(entry);
    console.error('\n🔴 PAGE ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  });

  try {
    // Step 1: Navigate to login
    console.log('\n1️⃣  Navigating to login page...');
    await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle' });

    // Step 2: Fill email and submit
    console.log(`2️⃣  Filling email: ${TEST_USER_EMAIL}`);
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill(TEST_USER_EMAIL);

    console.log('3️⃣  Submitting login form...');
    const submitButton = await page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Step 3: Wait for magic link confirmation or login success
    console.log('4️⃣  Waiting for authentication...');
    console.log('    ⚠️  YOU NEED TO:');
    console.log('    1. Check your email for magic link');
    console.log('    2. Click the link in your email');
    console.log('    3. Wait for redirect to /briefs');
    console.log('');
    console.log('    OR if you used password login, continue normally');
    console.log('');
    console.log('    ⏳ Waiting up to 2 minutes for authentication...\n');

    // Wait for navigation to /briefs (after magic link click)
    try {
      await page.waitForURL('**/briefs**', { timeout: 120000 });
      console.log('✅ Successfully navigated to /briefs page!\n');
    } catch (e) {
      console.error('❌ Timeout waiting for /briefs navigation');
      console.log('   Current URL:', page.url());
      console.log('   Did you click the magic link in your email?\n');
      throw e;
    }

    // Step 4: Wait for page to fully load and error to occur
    console.log('5️⃣  Waiting for page to load and monitoring for errors...\n');
    await page.waitForTimeout(10000); // Wait 10s for React to render and error to occur

    // Step 5: Analyze results
    console.log('\n=== RESULTS ===\n');

    // Check for React Error #185
    const hasReactError = pageErrors.some(err =>
      err.message.includes('Error #185') ||
      err.message.includes('Objects are not valid as a React child')
    ) || consoleLogs.some(log =>
      log.text.includes('Error #185') ||
      log.text.includes('Objects are not valid as a React child')
    );

    // Extract debug logs
    const slotLogs = consoleLogs.filter(log => log.text.includes('[SLOT'));
    const buttonLogs = consoleLogs.filter(log => log.text.includes('[BUTTON'));
    const cardLogs = consoleLogs.filter(log => log.text.includes('[CARD'));
    const badgeLogs = consoleLogs.filter(log => log.text.includes('[BADGE'));
    const linkLogs = consoleLogs.filter(log => log.text.includes('[LINK'));

    console.log('Component Render Logs:');
    console.log(`  SLOT renders: ${slotLogs.length}`);
    console.log(`  BUTTON renders: ${buttonLogs.length}`);
    console.log(`  CARD renders: ${cardLogs.length}`);
    console.log(`  BADGE renders: ${badgeLogs.length}`);
    console.log(`  LINK renders: ${linkLogs.length}`);
    console.log('');

    console.log(`React Error #185 Detected: ${hasReactError ? '🔴 YES' : '🟢 NO'}`);
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);
    console.log('');

    if (hasReactError) {
      console.log('🎯 SUCCESS! Error reproduced!\n');

      // Find the logs right before the error
      const errorIndex = consoleLogs.findIndex(log =>
        log.text.includes('Error #185') || log.text.includes('Objects are not valid')
      );

      if (errorIndex > 0) {
        console.log('📋 Logs in the 20 renders BEFORE the error:\n');
        const logsBeforeError = consoleLogs.slice(Math.max(0, errorIndex - 20), errorIndex);
        logsBeforeError.forEach((log, idx) => {
          console.log(`  ${idx + 1}. [${log.type}] ${log.text}`);
        });
      }

      console.log('\n🔍 All SLOT logs (these show what was passed to Radix Slot):\n');
      slotLogs.forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.text}`);
      });

      console.log('\n📄 Full Error Details:\n');
      pageErrors.forEach((err, idx) => {
        console.log(`  Error ${idx + 1}:`);
        console.log(`    Message: ${err.message}`);
        if (err.stack) {
          console.log(`    Stack: ${err.stack.split('\n').slice(0, 5).join('\n    ')}`);
        }
      });
    } else {
      console.log('⚠️  Error was NOT reproduced\n');
      console.log('Possible reasons:');
      console.log('  1. NEXT_PUBLIC_DEBUG_UI is not set to "true" in production');
      console.log('  2. No briefs data to render (empty list)');
      console.log('  3. Error is intermittent');
      console.log('  4. Authentication failed\n');

      console.log('Last 10 console logs:');
      consoleLogs.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. [${log.type}] ${log.text}`);
      });
    }

    // Take screenshot
    await page.screenshot({ path: 'briefs-error-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: briefs-error-debug.png\n');

    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 60 seconds for manual inspection...');
    console.log('   Press Ctrl+C to exit early\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
}

main().catch(console.error);
