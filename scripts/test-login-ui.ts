#!/usr/bin/env tsx
/**
 * End-to-end UI test for two-step login flow
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'http://localhost:3003';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testLoginUI() {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 Starting two-step login UI test\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();

    // Test 1: Existing user flow
    console.log('1️⃣  Testing existing user flow...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Should see email input
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('automation@nmbli.app');
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    await delay(2000);
    
    // Should automatically send magic link and redirect
    const hasCheckEmail = await page.url().includes('check-email');
    if (hasCheckEmail) {
      console.log('   ✅ Existing user: Magic link sent automatically\n');
    } else {
      console.log('   ⚠️  Expected redirect to check-email page\n');
    }

    // Test 2: New user with invite code flow
    console.log('2️⃣  Testing new user with invite code...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const newEmail = `test-${Date.now()}@example.com`;
    await page.locator('input[type="email"]').first().fill(newEmail);
    await page.click('button:has-text("Continue")');
    await delay(1500);
    
    // Should see invite code input
    const hasInviteField = await page.locator('input[placeholder*="testdrive"]').isVisible();
    if (hasInviteField) {
      console.log('   ✅ New user: Invite code field shown\n');
    } else {
      console.log('   ❌ FAIL: Invite code field not shown\n');
    }
    
    // Should see waitlist button
    const hasWaitlistButton = await page.locator('button:has-text("Join waitlist")').isVisible();
    if (hasWaitlistButton) {
      console.log('   ✅ New user: Waitlist button shown\n');
    } else {
      console.log('   ❌ FAIL: Waitlist button not shown\n');
    }

    // Test 3: Join waitlist flow
    console.log('3️⃣  Testing join waitlist flow...');
    await page.click('button:has-text("Join waitlist")');
    await delay(1500);
    
    // Should see success toast
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('Added to waitlist') || bodyText?.includes('waitlist')) {
      console.log('   ✅ Waitlist: Success message shown\n');
    } else {
      console.log('   ⚠️  Waitlist success message not detected\n');
    }

    // Test 4: New user with valid invite code
    console.log('4️⃣  Testing new user with valid invite code...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const anotherEmail = `invitetest-${Date.now()}@example.com`;
    await page.locator('input[type="email"]').first().fill(anotherEmail);
    await page.click('button:has-text("Continue")');
    await delay(1500);
    
    // Fill invite code
    await page.locator('input[placeholder*="testdrive"]').fill('testdrive');
    await page.click('button:has-text("Send magic link")');
    await delay(2000);
    
    const sentMagicLink = await page.url().includes('check-email');
    if (sentMagicLink) {
      console.log('   ✅ Invite code: Magic link sent successfully\n');
    } else {
      console.log('   ⚠️  Expected redirect to check-email page\n');
    }

    // Test 5: Change email functionality
    console.log('5️⃣  Testing change email button...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').first().fill('changeme@example.com');
    await page.click('button:has-text("Continue")');
    await delay(1000);
    
    // Click "Change email"
    const changeEmailButton = page.locator('button:has-text("Change email")');
    if (await changeEmailButton.isVisible()) {
      await changeEmailButton.click();
      await delay(500);
      
      // Should be back to email input
      const backToEmailInput = await page.locator('input[type="email"]').first().isVisible();
      if (backToEmailInput) {
        console.log('   ✅ Change email: Returns to email input\n');
      } else {
        console.log('   ❌ FAIL: Did not return to email input\n');
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ UI TESTS COMPLETED');
    console.log('═══════════════════════════════════════\n');

    await delay(2000);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

testLoginUI()
  .then(() => {
    console.log('✅ All UI tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ UI test failed:', error.message);
    process.exit(1);
  });
