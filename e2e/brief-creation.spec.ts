import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const RUN_FULL_E2E = process.env.RUN_FULL_E2E === '1';
test.skip(!RUN_FULL_E2E, 'Requires full interactive auth + UI flow; run with RUN_FULL_E2E=1');

test.describe('Brief Creation', () => {
  test.beforeAll(() => {
    // Run the database seeder before all tests in this file
    execSync('npm run db:seed', { stdio: 'inherit' });
  });

  test('should create a new brief successfully', async ({ page }) => {
    // Step 1: Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', 'automation2@nmbli.app');
    await page.fill('input[name="password"]', 'hE0fp6keXcnITdPAsoHZ!Aa9');
    await page.click('button[type="submit"]');
    await page.waitForURL('/briefs');

    // Step 2: Navigate to the new brief form
    await page.click('text=Create a New Brief');
    await page.waitForURL('/briefs/new');

    // Step 3: Fill out the form
    await page.fill('input[name="zipcode"]', '90210');
    await page.selectOption('select[name="paymentType"]', 'cash');
    await page.fill('input[name="maxOTD"]', '50000');
    await page.fill('input[name="makes"]', 'Toyota');
    await page.fill('input[name="models"]', 'Camry');
    await page.fill('input[name="trims"]', 'LE');
    await page.fill('input[name="colors"]', 'Black');
    await page.fill('input[name="mustHaves"]', 'Leather seats');
    await page.selectOption('select[name="timelinePreference"]', 'asap');

    // Add an extra field to test the fix
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const extraInput = document.createElement('input');
        extraInput.type = 'hidden';
        extraInput.name = 'extraField';
        extraInput.value = 'should be ignored';
        form.appendChild(extraInput);
      }
    });

    // Step 4: Submit the form and watch for the API response
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/briefs') && response.request().method() === 'POST'
    );
    await page.click('button[type="submit"]');
    const response = await responsePromise;

    // Step 5: Assertions
    expect(response.status()).toBe(200); // or 201
    
    // Check for success message or redirection
    await expect(page.locator('text=Brief created successfully')).toBeVisible();
    await expect(page).toHaveURL(/.*\/briefs\/.*/); // Should redirect to the new brief's page
  });
});
