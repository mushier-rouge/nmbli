import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { requireEnv } from '@/lib/utils/env';

let loggedSupabaseEnv = false;

export function createSupabaseRouteClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!loggedSupabaseEnv) {
    const host = (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return 'invalid-url';
      }
    })();
    console.log(`[SupabaseRouteClient] Using Supabase host: ${host}`);
    loggedSupabaseEnv = true;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });
}
