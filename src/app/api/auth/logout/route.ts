import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Signed out' });
  const supabase = createSupabaseRouteClient(request, response);
  await supabase.auth.signOut();
  response.cookies.delete('impersonateDealerId');
  return response;
}
