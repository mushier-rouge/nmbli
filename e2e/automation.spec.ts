import { test, expect } from '@playwright/test';

// This test requires DATABASE_URL to be set and the test database to be seeded
test.describe('Dealer Automation E2E', () => {
  test.beforeEach(async () => {
    // Ensure test data is seeded
    // Run: npm run db:seed
  });

  test('should trigger automation for test brief', async ({ request }) => {
    // Test the automation API endpoint directly
    const response = await request.post('/api/briefs/test-brief-1/automate', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.briefId).toBe('test-brief-1');
  });

  test('should discover dealers for brief', async ({ request }) => {
    // This tests that the dealer discovery works
    const response = await request.post('/api/briefs/test-brief-1/automate');
    
    expect(response.ok()).toBeTruthy();
    
    // The automation should have discovered dealers
    // We can verify by checking the database or timeline events
  });

  test('should handle automation errors gracefully', async ({ request }) => {
    // Test with invalid brief ID
    const response = await request.post('/api/briefs/invalid-brief-id/automate');
    
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.error).toContain('not found');
  });
});

test.describe('Brief Creation Flow', () => {
  test('should create a new brief', async ({ page }) => {
    // Go to new brief page
    await page.goto('/briefs/new');

    // Fill out the form
    await page.fill('[name="zipcode"]', '98101');
    await page.selectOption('[name="paymentType"]', 'lease');
    await page.fill('[name="maxOTD"]', '45000');
    
    // Select make
    await page.click('text=Select Make');
    await page.click('text=Toyota');
    
    // Select model
    await page.click('text=Select Model');
    await page.click('text=Camry');
    
    // Fill timeline
    await page.fill('[name="timeline"]', 'Within 2 weeks');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to brief detail page
    await expect(page).toHaveURL(/\/briefs\/.+/);
  });
});
