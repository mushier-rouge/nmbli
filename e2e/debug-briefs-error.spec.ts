import { test, expect } from '@playwright/test';

test.describe('Debug React Error #185 on /briefs page', () => {
  test.skip('reproduce and capture React error after login', async ({ page }) => {
    // Skipped: This is a debugging test for manual investigation, not automated testing
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        consoleErrors.push(`[ERROR] ${text}`);
      } else if (type === 'log') {
        consoleLogs.push(`[LOG] ${text}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
      console.error('PAGE ERROR:', error.message);
      console.error('STACK:', error.stack);
    });

    console.log('\n=== Starting test to reproduce React Error #185 ===\n');

    // Navigate to login page
    await page.goto('/login');
    console.log('1. Navigated to /login');

    // Check if we need a test user email from env
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';

    // Fill in email and submit
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.fill(testEmail);
    console.log(`2. Filled email: ${testEmail}`);

    // Click submit button
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    console.log('3. Clicked submit button');

    // Wait for redirect or confirmation
    await page.waitForTimeout(2000);

    console.log('4. Waiting for magic link confirmation or session...');

    // In a real scenario, you'd need to:
    // - Get the magic link from email (or bypass auth for testing)
    // - Or use password login if available

    // For now, let's try to navigate directly to /briefs and see if session exists
    // This assumes you have a way to set up auth in tests

    console.log('5. Attempting to navigate to /briefs...');

    // Wait a bit and navigate
    await page.goto('/briefs');

    // Wait for page to load or error to occur
    await page.waitForTimeout(5000);

    console.log('\n=== Console Logs Before Error ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));

    console.log('\n=== Page Errors ===');
    pageErrors.forEach(err => {
      console.log('Error:', err.message);
      console.log('Stack:', err.stack);
    });

    // Look for specific error patterns
    const hasReactError185 = consoleErrors.some(err =>
      err.includes('Error #185') || err.includes('Objects are not valid as a React child')
    ) || pageErrors.some(err =>
      err.message.includes('Error #185') || err.message.includes('Objects are not valid as a React child')
    );

    // Look for our debug logs
    const slotLogs = consoleLogs.filter(log => log.includes('[SLOT'));
    const buttonLogs = consoleLogs.filter(log => log.includes('[BUTTON'));
    const cardLogs = consoleLogs.filter(log => log.includes('[CARD'));

    console.log('\n=== Debug Component Logs ===');
    console.log(`SLOT logs: ${slotLogs.length}`);
    console.log(`BUTTON logs: ${buttonLogs.length}`);
    console.log(`CARD logs: ${cardLogs.length}`);

    if (slotLogs.length > 0) {
      console.log('\nLast 10 SLOT logs:');
      slotLogs.slice(-10).forEach(log => console.log(log));
    }

    if (buttonLogs.length > 0) {
      console.log('\nLast 10 BUTTON logs:');
      buttonLogs.slice(-10).forEach(log => console.log(log));
    }

    // Take a screenshot regardless of outcome
    await page.screenshot({ path: 'playwright-report/briefs-page-state.png', fullPage: true });

    console.log('\n=== Test Summary ===');
    console.log(`React Error #185 detected: ${hasReactError185}`);
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);

    if (hasReactError185) {
      console.log('\n✓ Successfully reproduced the error!');
      console.log('Check logs above for the render sequence before the error.');
    } else {
      console.log('\n✗ Error was not reproduced in this run.');
      console.log('This might mean:');
      console.log('1. Authentication failed (no session)');
      console.log('2. No briefs data to render');
      console.log('3. Error only occurs in production environment');
      console.log('4. NEXT_PUBLIC_DEBUG_UI is not enabled');
    }
  });
});
