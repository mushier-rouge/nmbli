import { test, expect } from '@playwright/test';

/**
 * E2E tests for automated quote negotiation system
 * Test-Driven Development: Tests written before implementation
 */

const RUN_TODO_E2E = process.env.RUN_TODO_E2E === '1';
test.skip(!RUN_TODO_E2E, 'TODO/experimental negotiation suite; run with RUN_TODO_E2E=1');

test.describe('Automated Quote Negotiation', () => {

  test('should send initial quote requests when brief is created', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to create brief
    await page.goto('/briefs/create');

    // Fill out brief form
    await page.fill('input[name="makes"]', 'Mazda');
    await page.fill('input[name="models"]', 'CX-90');
    await page.fill('input[name="zipcode"]', '95126');
    await page.fill('input[name="maxOTD"]', '50000');

    // Submit brief
    await page.click('button[type="submit"]');

    // Wait for brief to be created and redirected to brief page
    await page.waitForURL(/\/briefs\/.+/);

    // Extract brief ID from URL
    const url = page.url();
    const briefId = url.split('/briefs/')[1];

    // Verify quote emails were sent (check timeline)
    await expect(page.locator('text=Quote requests sent to 3 dealers')).toBeVisible({ timeout: 10000 });

    // Verify specific dealers were contacted
    await expect(page.locator('text=Stevens Creek Mazda')).toBeVisible();
    await expect(page.locator('text=Capitol Mazda')).toBeVisible();
    await expect(page.locator('text=San Jose Mazda')).toBeVisible();

    // Verify FROM email format
    await expect(page.locator(`text=quote-${briefId}@nmbli.com`)).toBeVisible();
  });

  test('should display sent quote request emails in UI', async ({ page }) => {
    // Assuming brief already exists with ID from previous test
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to briefs list
    await page.goto('/briefs');

    // Click on first brief
    await page.click('.brief-card:first-child');

    // Navigate to "Quotes" or "Communications" tab
    await page.click('button:has-text("Quotes")');

    // Verify quote requests are displayed
    const quoteCards = page.locator('.quote-request-card');
    await expect(quoteCards).toHaveCount(3);

    // Verify each quote card has required information
    for (let i = 0; i < 3; i++) {
      const card = quoteCards.nth(i);
      await expect(card.locator('.dealer-name')).toBeVisible();
      await expect(card.locator('.sent-date')).toBeVisible();
      await expect(card.locator('.email-status')).toHaveText(/sent|delivered/);
    }
  });

  test('should parse incoming dealer quote emails', async ({ request }) => {
    // Simulate webhook receiving dealer response
    const webhookPayload = {
      to: 'quote-test123@nmbli.com',
      from: 'sales@stevenscreekmazda.com',
      subject: 'Re: Quote Request - 2024 Mazda CX-90 Premium',
      body: `
        Thank you for your inquiry!

        We can offer the 2024 Mazda CX-90 Premium for:

        MSRP: $48,500
        Dealer Discount: -$2,000
        Taxes & Fees: +$4,200
        ------------------------
        Out-the-Door Price: $50,700

        This is our best price. Let us know if you'd like to move forward!

        Best regards,
        Stevens Creek Mazda Sales Team
      `,
      receivedAt: new Date().toISOString(),
    };

    const response = await request.post('/api/emails/inbound', {
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.parsed).toBeTruthy();
    expect(data.quote.otdPrice).toBe(50700);
    expect(data.quote.dealerName).toBe('Stevens Creek Mazda');
  });

  test('should display received quotes in UI', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs');
    await page.click('.brief-card:first-child');
    await page.click('button:has-text("Quotes")');

    // Wait for quotes to load
    await page.waitForSelector('.received-quote-card', { timeout: 10000 });

    const receivedQuotes = page.locator('.received-quote-card');
    await expect(receivedQuotes).toHaveCountGreaterThan(0);

    // Verify first quote has all required fields
    const firstQuote = receivedQuotes.first();
    await expect(firstQuote.locator('.dealer-name')).toBeVisible();
    await expect(firstQuote.locator('.otd-price')).toBeVisible();
    await expect(firstQuote.locator('.received-date')).toBeVisible();
    await expect(firstQuote.locator('button:has-text("View Details")')).toBeVisible();
  });

  test('should send counter-offers after 2 minutes', async ({ page }) => {
    // Create brief
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs/create');
    await page.fill('input[name="makes"]', 'Mazda');
    await page.fill('input[name="models"]', 'CX-90');
    await page.fill('input[name="zipcode"]', '95126');
    await page.fill('input[name="maxOTD"]', '50000');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/briefs\/.+/);

    // Wait 2 minutes + 10 seconds for counter-offer to be sent
    await page.waitForTimeout((2 * 60 * 1000) + 10000);

    // Refresh page to see updated timeline
    await page.reload();

    // Verify counter-offer was sent
    await expect(page.locator('text=Counter-offers sent to all dealers')).toBeVisible();
    await expect(page.locator('text=Round 2: Counter-offer')).toBeVisible();
  });

  test('should send final round with lowest price after 4 minutes', async ({ page }) => {
    // Assuming brief was created 4+ minutes ago and has received quotes
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs');
    await page.click('.brief-card:first-child');

    // Wait for final round (4 min from creation)
    await page.waitForTimeout((4 * 60 * 1000) + 10000);
    await page.reload();

    // Verify final round email was sent
    await expect(page.locator('text=Final round quotes sent')).toBeVisible();
    await expect(page.locator('text=Round 3: Final offer')).toBeVisible();

    // Verify final round mentions lowest price
    await expect(page.locator('text=/lowest.*\\$\\d+,\\d+/')).toBeVisible();
  });

  test('should show quote comparison table', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs');
    await page.click('.brief-card:first-child');
    await page.click('button:has-text("Compare Quotes")');

    // Verify comparison table exists
    const table = page.locator('.quotes-comparison-table');
    await expect(table).toBeVisible();

    // Verify table headers
    await expect(table.locator('th:has-text("Dealer")')).toBeVisible();
    await expect(table.locator('th:has-text("Initial Quote")')).toBeVisible();
    await expect(table.locator('th:has-text("Counter Offer")')).toBeVisible();
    await expect(table.locator('th:has-text("Final Price")')).toBeVisible();

    // Verify lowest price is highlighted
    await expect(table.locator('.lowest-price')).toHaveCount(1);
  });

  test('should allow user to select winning dealer', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs');
    await page.click('.brief-card:first-child');
    await page.click('button:has-text("Compare Quotes")');

    // Click "Select" button on lowest quote
    const lowestQuoteRow = page.locator('.lowest-price').locator('xpath=ancestor::tr');
    await lowestQuoteRow.locator('button:has-text("Select")').click();

    // Verify confirmation dialog
    await expect(page.locator('text=Confirm dealer selection')).toBeVisible();
    await page.click('button:has-text("Confirm")');

    // Verify brief status changed
    await expect(page.locator('.brief-status')).toHaveText('Dealer Selected');

    // Verify timeline shows selection
    await expect(page.locator('text=Dealer selected: Stevens Creek Mazda')).toBeVisible();
  });

  test('should handle email delivery failures gracefully', async ({ request }) => {
    const response = await request.post('/api/briefs/test-brief-id/send-quotes', {
      data: {
        dealerEmail: 'invalid@nonexistent-domain-12345.com',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].reason).toContain('bounce');
  });

  test('should not send duplicate emails to same dealer', async ({ page, request }) => {
    // Create brief
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.AUTOMATION_TEST_USER_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/briefs/create');
    await page.fill('input[name="makes"]', 'Mazda');
    await page.fill('input[name="models"]', 'CX-90');
    await page.fill('input[name="zipcode"]', '95126');
    await page.fill('input[name="maxOTD"]', '50000');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/briefs\/.+/);
    const url = page.url();
    const briefId = url.split('/briefs/')[1];

    // Try to manually trigger sending quotes again (should be prevented)
    const response = await request.post(`/api/briefs/${briefId}/send-quotes`);

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already sent');
  });
});
