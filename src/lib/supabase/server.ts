import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars for server client');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => {
        try {
          const store = await cookies();
          return store.getAll().map(({ name, value }) => ({ name, value }));
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[supabase] Unable to read cookies', error);
          }
          return [];
        }
      },
      setAll: async (cookieList) => {
        try {
          const store = await cookies();
          for (const cookie of cookieList) {
            try {
              store.set({
                name: cookie.name,
                value: cookie.value,
                ...cookie.options,
              });
            } catch (innerError) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[supabase] Skipping individual cookie set', {
                  cookie,
                  error: innerError,
                });
              }
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[supabase] Unable to write cookies', error);
          }
        }
      },
    },
  });
}
