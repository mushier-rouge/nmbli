import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';

type CookieStore = {
  get: (name: string) => { value?: string } | undefined;
  set?: ((...args: unknown[]) => unknown) | undefined;
  delete?: ((...args: unknown[]) => unknown) | undefined;
};

function setCookie(cookieStore: CookieStore, name: string, value: string, options: CookieOptions) {
  if (!cookieStore.set) {
    return;
  }

  try {
    cookieStore.set({ name, value, ...options });
  } catch (error) {
    try {
      cookieStore.set(name, value, options);
    } catch (secondError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[supabase][server-client] failed to set cookie', { name, error, secondError });
      }
    }
  }
}

function removeCookie(cookieStore: CookieStore, name: string, options: CookieOptions) {
  if (cookieStore.delete) {
    try {
      cookieStore.delete(name, options);
      return;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[supabase][server-client] failed to delete cookie', { name, error });
      }
    }
  }

  setCookie(cookieStore, name, '', { ...options, maxAge: 0 });
}

export function createServerClient(cookieStore: CookieStore) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars for server client');
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        setCookie(cookieStore, name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        removeCookie(cookieStore, name, options);
      },
    },
  });
}
