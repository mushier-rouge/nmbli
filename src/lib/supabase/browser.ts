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

  // Default cookie handling - only configure custom handlers in browser
  if (typeof window !== 'undefined') {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          const cookies = document.cookie.split('; ');
          for (const cookie of cookies) {
            const [key, ...values] = cookie.split('=');
            if (key === name) {
              return decodeURIComponent(values.join('='));
            }
          }
          return null;
        },
        set(name: string, value: string, options: any) {
          let cookieStr = `${name}=${encodeURIComponent(value)}`;
          if (options.maxAge) cookieStr += `; max-age=${options.maxAge}`;
          if (options.path) cookieStr += `; path=${options.path}`;
          if (options.sameSite) cookieStr += `; samesite=${options.sameSite}`;
          if (options.secure) cookieStr += '; secure';
          document.cookie = cookieStr;
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; path=${options.path || '/'}; max-age=0`;
        },
      },
    });
  } else {
    // Server-side: use default (no custom cookie handlers)
    client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG][getSupabaseBrowserClient] created new client', { timestamp: new Date().toISOString() });
  }
  return client;
}
