/**
 * Test the /automate endpoint to verify dealer discovery works
 */

const BRIEF_ID = 'a12d28c4-c649-43e0-97e5-517fc81cbca4';
const BASE_URL = 'https://nmbli.com';

async function testAutomateEndpoint() {
  console.log(`\n🧪 Testing /automate endpoint for brief ${BRIEF_ID}...\n`);

  try {
    const response = await fetch(`${BASE_URL}/api/briefs/${BRIEF_ID}/automate`, {
      method: 'POST',
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Automation endpoint worked!');
      console.log('\nCheck the brief at:', `${BASE_URL}/briefs/${BRIEF_ID}`);
    } else {
      console.log('\n❌ Automation endpoint failed');
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

testAutomateEndpoint();
