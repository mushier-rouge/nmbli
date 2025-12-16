import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeEnvValue } from '@/lib/utils/env';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG][getSupabaseBrowserClient] reuse existing client', { timestamp: new Date().toISOString() });
    }
    return client;
  }

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars for browser client');
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG][getSupabaseBrowserClient] created new client with localStorage', { timestamp: new Date().toISOString() });
  }
  return client;
}
