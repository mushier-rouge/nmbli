import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const RUN_FULL_E2E = process.env.RUN_FULL_E2E === '1';
test.skip(!RUN_FULL_E2E, 'Requires full e2e flow; run with RUN_FULL_E2E=1');

test.describe('Brief Creation', () => {
  test.beforeAll(() => {
    // Run the database seeder before all tests in this file
    execSync('npm run db:seed', { stdio: 'inherit' });
  });

  test('should create a new brief successfully', async ({ page }) => {
    // 1) Log in via password-login API to set cookies in this browser context
    const loginResponse = await page.request.post('/api/auth/password-login', {
      data: { email: 'automation2@nmbli.app', password: 'hE0fp6keXcnITdPAsoHZ!Aa9' },
    });
    expect(loginResponse.status()).toBe(200);

    // 2) Navigate to the new brief form
    await page.goto('/briefs/new');
    await page.waitForURL('/briefs/new');

    // 3) Fill out the form
    await page.getByLabel('Buyer ZIP').fill('90210');
    await page.getByLabel('Max OTD budget').fill('50000');
    await page.getByLabel('Timeline').fill('ASAP');

    // Vehicle selector (Make/Model)
    const makeSection = page.locator('label:has-text("Make")').locator('..');
    await makeSection.getByRole('combobox').click();
    await makeSection.locator('label:has-text("Toyota") [data-slot="radio-group-item"]').click();

    const modelSection = page.locator('label:has-text("Model")').locator('..');
    await modelSection.getByRole('combobox').click();
    await modelSection.locator('label:has-text("Camry") [data-slot="radio-group-item"]').click();

    await page.getByLabel('Color palette').fill('Black');
    await page.getByLabel('Must-haves').fill('Leather seats');

    // 4) Submit
    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/briefs') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Create brief' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    const briefId = createBody.brief.id as string;
    expect(briefId).toBeTruthy();

    // 5) Assert redirect to the new brief's page
    await page.waitForURL(`/briefs/${briefId}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Toyota');

    // Cleanup: delete the created brief so the test environment stays tidy
    const deleteResponse = await page.request.delete(`/api/briefs/${briefId}`);
    expect(deleteResponse.status()).toBe(200);
  });
});
