import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
    // Placeholder stub for webhook handling
    // Logic to process incoming events would go here

    console.log('Webhook received');
    return NextResponse.json({ received: true });
}
