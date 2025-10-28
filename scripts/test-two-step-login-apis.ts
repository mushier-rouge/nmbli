#!/usr/bin/env tsx
/**
 * Test script for the new two-step login flow APIs
 */

const BASE_URL = 'http://localhost:3003';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testCheckEmailExisting() {
  log('\n📧 Test 1: Check existing user email', colors.blue);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'automation@nmbli.app' }),
    });

    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (data.exists === true && data.needsInvite === false) {
      log('✅ PASS: Existing user correctly identified', colors.green);
      return true;
    } else {
      log('❌ FAIL: Expected exists=true, needsInvite=false', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${error}`, colors.red);
    return false;
  }
}

async function testCheckEmailNew() {
  log('\n📧 Test 2: Check new user email', colors.blue);

  const newEmail = `test-${Date.now()}@example.com`;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    });

    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (data.exists === false && data.needsInvite === true) {
      log('✅ PASS: New user correctly identified', colors.green);
      return true;
    } else {
      log('❌ FAIL: Expected exists=false, needsInvite=true', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${error}`, colors.red);
    return false;
  }
}

async function testWaitlistJoin() {
  log('\n📝 Test 3: Join waitlist', colors.blue);

  const waitlistEmail = `waitlist-${Date.now()}@example.com`;

  try {
    const response = await fetch(`${BASE_URL}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waitlistEmail }),
    });

    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (response.ok && data.message) {
      log('✅ PASS: Successfully joined waitlist', colors.green);
      return true;
    } else {
      log('❌ FAIL: Waitlist join failed', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${error}`, colors.red);
    return false;
  }
}

async function testWaitlistDuplicate() {
  log('\n📝 Test 4: Join waitlist with duplicate email', colors.blue);

  const email = `duplicate-${Date.now()}@example.com`;

  try {
    // First join
    await fetch(`${BASE_URL}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    // Try to join again
    const response = await fetch(`${BASE_URL}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (response.ok && data.message.includes('already on the waitlist')) {
      log('✅ PASS: Duplicate email handled correctly', colors.green);
      return true;
    } else {
      log('❌ FAIL: Duplicate email not handled properly', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${error}`, colors.red);
    return false;
  }
}

async function testInvalidEmail() {
  log('\n📧 Test 5: Check-email with invalid email format', colors.blue);

  try {
    const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    const data = await response.json();
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (response.status === 400 && data.message === 'Invalid email') {
      log('✅ PASS: Invalid email rejected', colors.green);
      return true;
    } else {
      log('❌ FAIL: Invalid email should return 400', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${error}`, colors.red);
    return false;
  }
}

async function runAllTests() {
  log('\n🧪 Running login flow API tests...\n', colors.yellow);

  const results = await Promise.all([
    testCheckEmailExisting(),
    testCheckEmailNew(),
    testWaitlistJoin(),
    testWaitlistDuplicate(),
    testInvalidEmail(),
  ]);

  const passed = results.filter((r) => r).length;
  const total = results.length;

  log(`\n${'='.repeat(50)}`, colors.yellow);
  log(`\n📊 Test Results: ${passed}/${total} passed\n`, colors.yellow);

  if (passed === total) {
    log('✅ All tests passed!', colors.green);
  } else {
    log(`❌ ${total - passed} test(s) failed`, colors.red);
  }
}

runAllTests().catch(console.error);
