#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to /test-vehicle-selector...');
  await page.goto('http://localhost:3000/test-vehicle-selector', { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'test-vehicle-selector-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-vehicle-selector-screenshot.png');

  const html = await page.content();
  console.log('\nPage HTML length:', html.length);
  console.log('\nPage title:', await page.title());

  const buttons = await page.locator('button').all();
  console.log(`\nFound ${buttons.length} buttons on page`);

  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const text = await buttons[i].textContent();
    console.log(`  Button ${i + 1}: "${text}"`);
  }

  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch(console.error);
