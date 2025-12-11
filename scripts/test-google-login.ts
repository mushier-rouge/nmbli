import { chromium } from 'playwright';

async function testGoogleLogin() {
  console.log('🧪 Testing Google OAuth login flow...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  // Capture network errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.error('❌ Request Failed:', request.url(), request.failure()?.errorText);
  });

  try {
    // Step 1: Navigate to login page
    console.log('\n📍 Step 1: Navigating to login page...');
    await page.goto('https://nmbli.com/login', { waitUntil: 'networkidle' });
    console.log('✅ Login page loaded');

    // Step 2: Check if Google button exists
    console.log('\n📍 Step 2: Looking for Google login button...');
    const googleButton = await page.locator('button:has-text("Google")').first();
    const buttonExists = await googleButton.count() > 0;

    if (!buttonExists) {
      console.error('❌ Google login button not found!');
      return;
    }
    console.log('✅ Google login button found');

    // Step 3: Click Google button and capture what happens
    console.log('\n📍 Step 3: Clicking Google login button...');

    // Wait for navigation or popup
    const [responseOrPage] = await Promise.race([
      Promise.all([
        page.waitForNavigation({ timeout: 10000 }).catch(() => null),
        googleButton.click()
      ]),
      page.waitForEvent('popup', { timeout: 10000 }).then(popup => [popup]).catch(() => [null])
    ]);

    if (responseOrPage) {
      console.log('✅ Navigation/popup triggered');

      // Check if we were redirected to Google
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);

      if (currentUrl.includes('accounts.google.com')) {
        console.log('✅ Successfully redirected to Google OAuth!');
        console.log('✅ OAuth flow initiated correctly');
      } else if (currentUrl.includes('supabase')) {
        console.log('✅ Redirected to Supabase OAuth');
      } else {
        console.log('⚠️  Unexpected redirect:', currentUrl);
      }
    }

    // Step 4: Check for any errors in console
    console.log('\n📍 Step 4: Checking for errors...');
    const errors = consoleLogs.filter(log =>
      log.includes('[error]') ||
      log.includes('ERROR') ||
      log.includes('500') ||
      log.includes('failed')
    );

    if (errors.length > 0) {
      console.log('❌ Found errors in console:');
      errors.forEach(err => console.log('  ', err));
    } else {
      console.log('✅ No errors found in console');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('Login page loads:', '✅');
    console.log('Google button exists:', buttonExists ? '✅' : '❌');
    console.log('OAuth redirect works:', responseOrPage ? '✅' : '❌');
    console.log('Console errors:', errors.length === 0 ? '✅ None' : `❌ ${errors.length} found`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testGoogleLogin().catch(console.error);
