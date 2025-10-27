#!/usr/bin/env tsx
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  await page.waitForTimeout(1000);

  console.log('Taking screenshot before clicking tab...');
  await page.screenshot({ path: 'login-before-tab.png', fullPage: true });

  console.log('Clicking Email & Password tab...');
  await page.getByRole('tab', { name: /Email.*Password/i }).click();

  await page.waitForTimeout(2000);

  console.log('Taking screenshot after clicking tab...');
  await page.screenshot({ path: 'login-after-tab.png', fullPage: true });

  const inputs = await page.locator('input').all();
  console.log(`\nFound ${inputs.length} inputs`);

  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    const name = await inputs[i].getAttribute('name');
    console.log(`  Input ${i + 1}: type="${type}", placeholder="${placeholder}", name="${name}"`);
  }

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
