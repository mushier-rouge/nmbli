
import { SkyvernClient } from '../src/lib/automation/skyvern';

// Mock fetch
const originalFetch = global.fetch;
let fetchCallCount = 0;

global.fetch = async (input, init) => {
    fetchCallCount++;
    console.log(`[MockFetch] Call #${fetchCallCount} to ${input}`);

    // Simulate failure for the first 2 calls, success on the 3rd
    if (fetchCallCount <= 2) {
        return {
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        } as any;
    }

    // Success response
    return {
        ok: true,
        json: async () => ({ run_id: 'run_12345', status: 'pending' }),
    } as any;
};

async function testRetryLogic() {
    console.log('🧪 Testing Skyvern Retry Logic...');

    const client = new SkyvernClient('test-key');

    try {
        const result = await client.createWorkflow({
            url: 'https://example.com',
        });

        console.log('✅ Workflow created successfully:', result);

        if (fetchCallCount === 3) {
            console.log('✅ Retry logic worked! (Called fetch 3 times)');
        } else {
            console.error(`❌ Unexpected fetch count: ${fetchCallCount}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    } finally {
        // Restore fetch
        global.fetch = originalFetch;
    }
}

testRetryLogic();
