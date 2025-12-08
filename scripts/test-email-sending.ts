/**
 * Test script to verify email sending functionality
 * This script will:
 * 1. Create a new brief
 * 2. Call the send-quotes API
 * 3. Verify emails are actually sent
 */

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'automation@nmbli.app';

async function testEmailSending() {
  console.log('\n🧪 Testing Email Sending Functionality\n');

  try {
    // Step 1: Login to get session
    console.log('Step 1: Logging in as test user...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log(`✓ Login initiated for ${TEST_EMAIL}\n`);

    // Step 2: Create a brief
    console.log('Step 2: Creating a test brief...');
    const briefResponse = await fetch(`${BASE_URL}/api/briefs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        makes: ['Toyota'],
        models: ['RAV4'],
        zipcode: '98101',
        maxOTD: '45000',
        paymentType: 'finance',
        mustHaves: [],
      }),
    });

    if (!briefResponse.ok) {
      const error = await briefResponse.json();
      throw new Error(`Brief creation failed: ${JSON.stringify(error)}`);
    }

    const briefData = await briefResponse.json();
    const briefId = briefData.id;
    console.log(`✓ Brief created with ID: ${briefId}\n`);

    // Step 3: Send quote requests
    console.log('Step 3: Sending quote requests to dealers...');
    const sendResponse = await fetch(`${BASE_URL}/api/briefs/${briefId}/send-quotes`, {
      method: 'POST',
    });

    const sendData = await sendResponse.json();

    console.log('\n📧 Send Quotes Response:');
    console.log(JSON.stringify(sendData, null, 2));

    if (!sendResponse.ok) {
      console.error('\n❌ FAILED: Email sending returned error status');
      console.error('Response status:', sendResponse.status);
      console.error('Error:', sendData.error);
      process.exit(1);
    }

    // Step 4: Verify results
    console.log('\n✅ Verification:');
    console.log(`- Success: ${sendData.success}`);
    console.log(`- Emails sent: ${sendData.sent?.length || 0}`);
    console.log(`- Emails failed: ${sendData.failed?.length || 0}`);

    if (sendData.sent && sendData.sent.length > 0) {
      console.log('\n📬 Emails sent to:');
      sendData.sent.forEach((result: any) => {
        console.log(`  ✓ ${result.dealer}: ${result.email}`);
        console.log(`    Subject: ${result.subject}`);
      });
    }

    if (sendData.failed && sendData.failed.length > 0) {
      console.log('\n❌ Failed emails:');
      sendData.failed.forEach((failure: any) => {
        console.log(`  ✗ ${failure.dealer}: ${failure.reason}`);
      });
    }

    console.log('\n🎉 TEST COMPLETED!');
    console.log(`\n📬 Check your email inbox for ${sendData.sent?.length || 0} emails`);
    console.log(`   All emails should be FROM: quote-${briefId}@nmbli.com\n`);

    // Exit with success if at least one email was sent
    if (sendData.sent && sendData.sent.length > 0) {
      process.exit(0);
    } else {
      console.error('\n❌ FAILED: No emails were sent!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    process.exit(1);
  }
}

testEmailSending();
