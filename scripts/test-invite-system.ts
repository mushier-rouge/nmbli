#!/usr/bin/env tsx
/**
 * Comprehensive test for the invite code system
 * Tests all scenarios: valid code, invalid code, used code, existing user
 */

import { chromium } from 'playwright';
import { PrismaClient } from '../src/generated/prisma';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function cleanupTestUser(email: string) {
  console.log(`🧹 Cleaning up test user: ${email}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️  Skipping Supabase cleanup (no service key)');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find and delete from Supabase
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);

  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
    console.log(`  ✓ Deleted from Supabase`);
  }

  // Delete from Prisma
  try {
    await prisma.user.delete({ where: { email } });
    console.log(`  ✓ Deleted from Prisma`);
  } catch (e) {
    // User might not exist in Prisma
  }
}

async function test1_ValidInviteCode() {
  console.log('\n🧪 TEST 1: Valid invite code (testdrive)\n');

  const testEmail = 'test-invite-valid@example.com';
  await cleanupTestUser(testEmail);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Navigate to login page');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Fill in email and valid invite code');
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[placeholder*="testdrive"]').first().fill('testdrive');

    console.log('3. Submit magic link request');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    // Check if we got success message
    const pageContent = await page.content();
    if (pageContent.includes('Magic link sent') || pageContent.includes('Check') || pageContent.includes('check-email')) {
      console.log('✅ TEST 1 PASSED: Valid invite code accepted\n');
      results.push({ name: 'Valid invite code', passed: true });
    } else {
      console.log('❌ TEST 1 FAILED: Valid invite code rejected\n');
      results.push({ name: 'Valid invite code', passed: false, error: 'Code was rejected' });
    }

    await page.waitForTimeout(3000);
  } catch (error) {
    console.log('❌ TEST 1 FAILED:', error);
    results.push({ name: 'Valid invite code', passed: false, error: String(error) });
  } finally {
    await browser.close();
  }
}

async function test2_InvalidInviteCode() {
  console.log('\n🧪 TEST 2: Invalid invite code (badcode)\n');

  const testEmail = 'test-invite-invalid@example.com';
  await cleanupTestUser(testEmail);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Navigate to login page');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Fill in email and INVALID invite code');
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[placeholder*="testdrive"]').first().fill('badcode');

    console.log('3. Submit magic link request');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    // Should NOT get success, should get error
    const pageContent = await page.content();
    if (pageContent.includes('Magic link sent') || pageContent.includes('check-email')) {
      console.log('❌ TEST 2 FAILED: Invalid code was accepted\n');
      results.push({ name: 'Invalid invite code rejected', passed: false, error: 'Code was accepted' });
    } else {
      console.log('✅ TEST 2 PASSED: Invalid invite code rejected\n');
      results.push({ name: 'Invalid invite code rejected', passed: true });
    }

    await page.waitForTimeout(3000);
  } catch (error) {
    console.log('❌ TEST 2 FAILED:', error);
    results.push({ name: 'Invalid invite code rejected', passed: false, error: String(error) });
  } finally {
    await browser.close();
  }
}

async function test3_AlreadyUsedInviteCode() {
  console.log('\n🧪 TEST 3: Already used invite code\n');

  // First mark 'horsepower' as used
  console.log('Setting up: Marking "horsepower" as used');
  await prisma.inviteCode.update({
    where: { code: 'horsepower' },
    data: {
      usedAt: new Date(),
      usedByEmail: 'previous-user@example.com',
      usedByUserId: 'fake-uuid',
    },
  });

  const testEmail = 'test-invite-used@example.com';
  await cleanupTestUser(testEmail);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Navigate to login page');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Fill in email and USED invite code');
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[placeholder*="testdrive"]').first().fill('horsepower');

    console.log('3. Submit magic link request');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    // Should NOT get success
    const pageContent = await page.content();
    if (pageContent.includes('Magic link sent') || pageContent.includes('check-email')) {
      console.log('❌ TEST 3 FAILED: Used code was accepted\n');
      results.push({ name: 'Used invite code rejected', passed: false, error: 'Code was accepted' });
    } else {
      console.log('✅ TEST 3 PASSED: Used invite code rejected\n');
      results.push({ name: 'Used invite code rejected', passed: true });
    }

    await page.waitForTimeout(3000);
  } catch (error) {
    console.log('❌ TEST 3 FAILED:', error);
    results.push({ name: 'Used invite code rejected', passed: false, error: String(error) });
  } finally {
    await browser.close();
  }
}

async function test4_ExistingUserLogin() {
  console.log('\n🧪 TEST 4: Existing user login (should not need invite code)\n');

  const testEmail = process.env.NEXT_PUBLIC_AUTOMATION_TEST_USER_EMAIL || 'automation@nmbli.app';
  const testPassword = process.env.NEXT_PUBLIC_AUTOMATION_TEST_USER_PASSWORD || 'Automation!123';

  console.log(`Using test credentials: ${testEmail}`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Navigate to login page');
    await page.goto('http://localhost:3003/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Click Email & Password tab');
    await page.getByRole('tab', { name: /Email.*Password/i }).click();
    await page.waitForTimeout(500);

    console.log('3. Fill in existing user credentials WITHOUT invite code');
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    // NOT filling invite code field (it shouldn't exist)

    console.log('4. Submit login');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Check if we're redirected (login successful)
    const url = page.url();
    if (url.includes('/briefs')) {
      console.log('✅ TEST 4 PASSED: Existing user logged in without invite code\n');
      results.push({ name: 'Existing user no invite code', passed: true });
    } else {
      console.log('❌ TEST 4 FAILED: Existing user could not login\n');
      console.log(`Current URL: ${url}`);
      results.push({ name: 'Existing user no invite code', passed: false, error: 'Login failed' });
    }

    await page.waitForTimeout(3000);
  } catch (error) {
    console.log('❌ TEST 4 FAILED:', error);
    results.push({ name: 'Existing user no invite code', passed: false, error: String(error) });
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 Starting Invite System Tests\n');
  console.log('=' .repeat(60));

  try {
    await test1_ValidInviteCode();
    await test2_InvalidInviteCode();
    await test3_AlreadyUsedInviteCode();
    await test4_ExistingUserLogin();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST RESULTS\n');

    results.forEach((result, idx) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${idx + 1}. ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`\n📈 Summary: ${passed}/${total} tests passed\n`);

    if (passed === total) {
      console.log('✨ All tests passed!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
