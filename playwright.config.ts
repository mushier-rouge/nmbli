import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

const useDevServer = !process.env.PLAYWRIGHT_NO_SERVER;

// Ensure Playwright has access to local env vars (Supabase service role keys, etc.)
// Next.js loads these automatically, but Playwright tests run in a separate Node process.
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: false });
loadEnv({ path: resolve(process.cwd(), '.env'), override: false });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: useDevServer
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,
});
