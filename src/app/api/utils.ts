import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { NextRequest, NextResponse } from 'next/server';

export async function createRouteClient(req: NextRequest, res: NextResponse) {
    return createSupabaseRouteClient(req, res);
}
