import { expect, test } from '@playwright/test';

import { generateMagicLink } from '../utils/supabase-admin';

const TEST_MAGIC_LINK_EMAIL = process.env.TEST_MAGIC_LINK_EMAIL ?? 'sanjay.devnani@gmail.com';

const hasSupabaseAdminCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

test.describe('Magic link login', () => {
  test.skip(!hasSupabaseAdminCreds, 'Supabase admin credentials are required for magic link tests');

  test('user can request and complete magic link login', async ({ page }, testInfo) => {
    // Stub the completion endpoint so we can run without a database connection.
    await page.route('**/api/auth/complete', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_MAGIC_LINK_EMAIL);
    await page.getByRole('button', { name: /email me a link/i }).click();

    await expect(page).toHaveURL(/\/login\/check-email$/);
    await expect(page.getByRole('heading', { name: /check your inbox/i })).toBeVisible();

    const baseURL = testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
    const redirectTo = new URL('/auth/callback', baseURL).toString();
    const magicLink = await generateMagicLink({ email: TEST_MAGIC_LINK_EMAIL, redirectTo });

    await page.goto(magicLink);

    await page.waitForURL(/\/auth\/callback/);
    await page.waitForURL(/\/briefs/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /your search briefs/i })).toBeVisible();
  });
});
