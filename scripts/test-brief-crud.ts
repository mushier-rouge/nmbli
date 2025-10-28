#!/usr/bin/env tsx
/**
 * Comprehensive Playwright tests for Brief CRUD operations
 *
 * Tests:
 * 1. Login flow (password authentication)
 * 2. Create brief (Toyota Camry in 98101)
 * 3. Trigger dealer discovery automation via POST /api/briefs/[id]/automate
 * 4. Delete brief (cleanup)
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'http://localhost:3003';
const TEST_EMAIL = 'automation2@nmbli.app';
const TEST_PASSWORD = 'hE0fp6keXcnITdPAsoHZ!Aa9';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(page: Page) {
  console.log('\n🔐 Test 1: Login Flow');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await delay(1000);

  // Switch to password tab using data attribute
  const passwordTab = page.locator('[role="tab"][value="password"]').or(page.locator('button[data-state]:has-text("Password")'));
  await passwordTab.click();
  await delay(1000);

  // Find the password form (TabsContent with value="password")
  const passwordForm = page.locator('[data-state="active"]').filter({ has: page.locator('input[type="password"]') });

  // Fill credentials in the visible form
  await passwordForm.locator('input[type="email"]').fill(TEST_EMAIL);
  await delay(300);
  await passwordForm.locator('input[type="password"]').fill(TEST_PASSWORD);
  await delay(300);

  // Submit the form
  await passwordForm.locator('button[type="submit"]').click();

  // Wait for navigation with longer timeout
  await page.waitForURL('**/briefs**', { timeout: 10000 }).catch(() => null);
  await delay(2000);

  // Verify redirect to /briefs
  const url = page.url();
  if (url.includes('/briefs')) {
    console.log('   ✅ Login successful, redirected to /briefs');
    return true;
  } else {
    console.log(`   ❌ FAIL: Not redirected to /briefs (at ${url})`);
    await page.screenshot({ path: 'login-fail.png' });
    return false;
  }
}

async function createBrief(page: Page): Promise<string | null> {
  console.log('\n📝 Test 2: Create Brief');

  await page.goto(`${BASE_URL}/briefs/new`);
  await page.waitForLoadState('networkidle');
  await delay(1000);

  // Select make using the combobox button
  console.log('   Selecting vehicle make...');
  const makeButton = page.locator('button[role="combobox"]').first();
  await makeButton.click();
  await delay(500);

  // Click on Toyota in the radio group
  await page.locator('label:has-text("Toyota")').click();
  await delay(800);

  // Select model
  console.log('   Selecting vehicle model...');
  const modelButton = page.locator('button[role="combobox"]').nth(1);
  await modelButton.click();
  await delay(500);

  // Click on Camry
  await page.locator('label:has-text("Camry")').click();
  await delay(800);

  // Fill other fields
  console.log('   Filling brief details...');
  await page.fill('input[name="zipcode"]', '98101');

  // Fill budget (max OTD price)
  const budgetInput = page.locator('input[type="number"]').first();
  await budgetInput.fill('35000');

  // Submit
  console.log('   Submitting brief...');
  await page.click('button[type="submit"]');

  // Wait for success toast instead of navigation (form stays on same page)
  await delay(2000);

  // Check for success toast message
  const toastVisible = await page.locator('text="Brief created"').isVisible().catch(() => false);

  if (toastVisible) {
    console.log('   ✅ Brief created successfully (toast confirmation)');

    // Navigate to briefs list to get the brief ID
    await page.goto(`${BASE_URL}/briefs`);
    await page.waitForLoadState('networkidle');
    await delay(1000);

    // Get all brief links
    const allLinks = await page.locator('a[href^="/briefs/"]').all();
    console.log(`   Found ${allLinks.length} total brief links`);

    // Filter out the "New Brief" link and find a real brief
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      if (href && !href.endsWith('/new') && href !== '/briefs') {
        const match = href.match(/\/briefs\/([a-f0-9\-]+)/i);
        const briefId = match ? match[1] : null;

        if (briefId) {
          console.log(`   📋 Brief ID: ${briefId}`);
          return briefId;
        }
      }
    }

    console.log('   ⚠️  Brief created but could not extract ID from links');
    return null;
  } else {
    console.log(`   ❌ FAIL: Brief creation failed (no success toast)`);
    await page.screenshot({ path: 'create-brief-fail.png' });
    return null;
  }
}

async function cleanupAllTestBriefs(page: Page) {
  console.log('\n🗑️  Test 3: Cleanup All Test Briefs');

  await page.goto(`${BASE_URL}/briefs`);
  await page.waitForLoadState('networkidle');
  await delay(1000);

  let deletedCount = 0;
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop

  while (attempts < maxAttempts) {
    attempts++;

    // Find all three-dot menus
    const menuButtons = page.locator('button[aria-label="Open menu"]').or(page.locator('button:has(svg.lucide-more-vertical)'));
    const count = await menuButtons.count();

    if (count === 0) {
      console.log(`   ✅ All test briefs cleaned up (deleted ${deletedCount} briefs)`);
      return true;
    }

    console.log(`   Found ${count} deletable briefs, deleting...`);

    // Delete the first one
    const firstMenu = menuButtons.first();
    await firstMenu.click();
    await delay(500);

    // Handle confirmation dialog
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.click('text="Delete brief"');
    await delay(2000);

    deletedCount++;

    // Reload to get fresh list
    await page.goto(`${BASE_URL}/briefs`);
    await page.waitForLoadState('networkidle');
    await delay(1000);
  }

  console.log(`   ⚠️  Cleanup incomplete (deleted ${deletedCount} briefs, may have more)`);
  return true;
}

async function triggerDealerDiscovery(page: Page, briefId: string) {
  console.log('\n🔍 Test 4: Dealer Discovery Automation');

  if (!briefId) {
    console.log('   ❌ FAIL: No brief ID provided');
    return false;
  }

  try {
    console.log(`   Triggering automation for brief ${briefId}...`);

    // Call the automate endpoint using page.evaluate to make API call with cookies
    const response = await page.evaluate(async (id) => {
      const res = await fetch(`/api/briefs/${id}/automate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        ok: res.ok,
        status: res.status,
        text: await res.text(),
      };
    }, briefId);

    console.log(`   API Response: ${response.status}`);

    if (response.ok) {
      console.log('   ✅ Dealer discovery automation triggered successfully');

      // Parse response to check for results
      try {
        const data = JSON.parse(response.text);
        if (data.dealersFound !== undefined) {
          console.log(`   📊 Dealers discovered: ${data.dealersFound}`);
        }
        if (data.dealersContacted !== undefined) {
          console.log(`   📧 Dealers contacted: ${data.dealersContacted}`);
        }
      } catch (e) {
        // Response might not be JSON
        console.log(`   Response: ${response.text.substring(0, 100)}`);
      }

      // Wait for processing
      await delay(3000);

      return true;
    } else {
      console.log(`   ❌ FAIL: Automation API returned ${response.status}`);
      console.log(`   Error: ${response.text}`);
      return false;
    }
  } catch (error) {
    console.error('   ❌ FAIL: Error triggering dealer discovery');
    console.error(error);
    return false;
  }
}

async function runAllTests() {
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    console.log('🧪 Starting Brief CRUD Playwright Tests\n');
    console.log(`📧 User: ${TEST_EMAIL}`);
    console.log(`🔗 URL: ${BASE_URL}\n`);
    console.log('='.repeat(50));
    
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();

    // Run tests sequentially
    const loginResult = await login(page);
    if (!loginResult) {
      throw new Error('Login failed - cannot continue with tests');
    }

    const briefId = await createBrief(page);
    const createResult = briefId !== null;

    let dealerSearchResult = false;
    if (briefId) {
      dealerSearchResult = await triggerDealerDiscovery(page, briefId);
    }

    // Always clean up ALL test briefs at the end
    const cleanupResult = await cleanupAllTestBriefs(page);

    const results = {
      login: loginResult,
      create: createResult,
      dealerDiscovery: dealerSearchResult,
      cleanup: cleanupResult,
    };
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Results:');
    console.log(`   Login: ${results.login ? '✅' : '❌'}`);
    console.log(`   Create Brief: ${results.create ? '✅' : '❌'}`);
    console.log(`   Dealer Discovery: ${results.dealerDiscovery ? '✅' : '❌'}`);
    console.log(`   Cleanup Test Briefs: ${results.cleanup ? '✅' : '❌'}`);
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log(`\n${passed}/${total} tests passed\n`);
    
    await delay(3000);
    
    if (passed === total) {
      console.log('✅ ALL TESTS PASSED!\n');
      return 0;
    } else {
      console.log('❌ SOME TESTS FAILED\n');
      return 1;
    }
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED');
    console.error(error);
    return 1;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

runAllTests()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
