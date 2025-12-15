import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/utils/env';

const warnOnce = (() => {
  const warned = new Set<string>();

  return (key: string, error: unknown) => {
    if (process.env.NODE_ENV !== 'development' || warned.has(key)) {
      return;
    }

    warned.add(key);
    console.warn(
      `[supabase][server] Skipped cookie ${key} outside of a Route Handler or Server Action. This is expected when running in a Server Component.`,
      error
    );
  };
})();

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  console.log('[DEBUG][getSupabaseServerClient] creating client', { timestamp: new Date().toISOString() });
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  console.log('[DEBUG][getSupabaseServerClient] env present', {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    timestamp: new Date().toISOString(),
  });

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        console.log('[DEBUG][getSupabaseServerClient] cookies.get', { name, timestamp: new Date().toISOString() });
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          console.log('[DEBUG][getSupabaseServerClient] cookies.set', { name, hasValue: Boolean(value), timestamp: new Date().toISOString() });
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          warnOnce('set', error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          console.log('[DEBUG][getSupabaseServerClient] cookies.remove', { name, timestamp: new Date().toISOString() });
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          warnOnce('remove', error);
        }
      },
    },
  });
}
