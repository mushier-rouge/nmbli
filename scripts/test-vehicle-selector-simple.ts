#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  console.log('\n=== Simple Vehicle Selector Test ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.text().includes('[VehicleSelector]')) {
      console.log(`[LOG] ${msg.text()}`);
    }
  });

  try {
    // Login
    console.log('1. Login...');
    await page.goto('http://localhost:3000/login');
    await page.getByRole('tab', { name: /Email.*Password/i }).click();
    await page.locator('input[type="email"]').first().fill('automation2@nmbli.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/briefs**', { timeout: 10000 });
    console.log('✅ Logged in\n');

    // Go to create brief
    console.log('2. Navigate to create brief...');
    await page.goto('http://localhost:3000/briefs/new');
    await page.waitForLoadState('networkidle');
    console.log('✅ On create brief page\n');

    // Select Tesla
    console.log('3. Select Tesla (make)...');
    await page.locator('button').filter({ hasText: /Select make/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: 'Tesla' }).click();
    await page.locator('h1').click(); // Close dropdown
    await page.waitForTimeout(300);
    console.log('✅ Tesla selected\n');

    // Select Model 3 (real model, not "Other")
    console.log('4. Select Model 3 (real model)...');
    await page.locator('button').filter({ hasText: /Select model/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Model 3")').first().click();
    await page.locator('h1').click(); // Close dropdown
    await page.waitForTimeout(300);
    console.log('✅ Model 3 selected\n');

    // Select "Other" for trim
    console.log('5. Select "Other" for trim...');
    await page.locator('button').filter({ hasText: /Select trim/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Other")').first().click();
    await page.waitForTimeout(500);
    console.log('✅ "Other" selected\n');

    // Type custom trim
    console.log('6. Type custom trim...');
    const customTrimInput = page.locator('input[placeholder*="Specify trim"]');
    await customTrimInput.waitFor({ state: 'visible', timeout: 5000 });
    await customTrimInput.fill('My Custom Trim');
    await page.waitForTimeout(500);
    console.log('✅ Custom trim entered\n');

    console.log('\n✅ ALL TESTS PASSED!\n');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await page.waitForTimeout(5000);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
