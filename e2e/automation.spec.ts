import { test, expect } from '@playwright/test';

// Focused e2e tests - don't require Gmail/Twilio credentials
test.describe('Dealer Automation E2E', () => {
  test('should handle automation errors gracefully with invalid brief', async ({ request }) => {
    // Test with invalid brief ID
    const response = await request.post('/api/briefs/invalid-brief-id/automate');

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  // Note: Full automation tests that send emails/SMS are skipped in e2e
  // Those require Gmail/Twilio credentials and should be tested manually or in CI
  // The core dealer discovery logic is tested in unit tests
});

test.describe('Brief Creation Flow', () => {
  test.skip('should create a new brief', async ({ page }) => {
    // Skipped: Requires authentication and full UI setup
    // This is better tested in unit/integration tests or manually
    await page.goto('/briefs/new');
  });
});
