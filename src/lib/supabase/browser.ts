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

  // Use default cookie-based storage for PKCE flow compatibility
  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG][getSupabaseBrowserClient] created new client', { timestamp: new Date().toISOString() });
  }
  return client;
}
