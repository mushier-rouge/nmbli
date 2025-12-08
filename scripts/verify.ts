import { prisma } from '../src/lib/prisma';
import { skyvern } from '../src/lib/automation/skyvern';

async function verify() {
    console.log('🕵️  Starting Intelligent Verification...\n');

    let passed = true;

    // 1. Database Integrity Check
    console.log('Checking Database Connection...');
    try {
        // Try to count users - simple read
        const userCount = await prisma.user.count();
        console.log(`✅ Database connected (User count: ${userCount})`);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        passed = false;
    }

    // 2. API Route Availability (Heuristic)
    // We can't easily fetch our own API routes in a CLI script unless the server is running.
    // But we can check if the files exist.
    console.log('\nChecking Critical API Routes...');
    const routes = [
        'src/app/api/auth/callback/route.ts',
        'src/app/api/auth/magic-link/route.ts',
        'src/app/api/briefs/route.ts',
        'src/app/api/ops/quotes/[quoteId]/publish/route.ts',
    ];

    const fs = require('fs');
    for (const route of routes) {
        if (fs.existsSync(route)) {
            console.log(`✅ Found ${route}`);
        } else {
            console.error(`❌ Missing ${route}`);
            passed = false;
        }
    }

    // 3. Skyvern Configuration Check
    console.log('\nChecking Skyvern Integration...');
    if (process.env.SKYVERN_API_KEY) {
        console.log('✅ SKYVERN_API_KEY is set');
        // Optional: Could ping Skyvern if we had a lightweight "ping" method, 
        // but creating a workflow costs money/credits usually.
        // We'll trust the key presence + client instantiation.
    } else {
        console.warn('⚠️ SKYVERN_API_KEY is not set (skipping functional check)');
    }

    // 4. Report
    console.log('\n----------------------------------------');
    if (passed) {
        console.log('✅ VERIFICATION PASSED');
        process.exit(0);
    } else {
        console.error('❌ VERIFICATION FAILED');
        process.exit(1);
    }
}

verify();
