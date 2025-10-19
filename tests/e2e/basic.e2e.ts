import { test, expect } from '@playwright/test';

test.describe('OutTheDoor smoke checks', () => {
  test.skip(true, 'Enable once database connection is configured for e2e');

  test('login screen renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'OutTheDoor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Email me a link' })).toBeVisible();
  });

  test('dealer landing explains invite flow', async ({ page }) => {
    await page.goto('/dealer');
    await expect(page.getByText('secure magic links')).toBeVisible();
  });
});
