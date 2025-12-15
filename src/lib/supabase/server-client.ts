import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { requireEnv } from '@/lib/utils/env';

type CookieStore = {
  get: (name: string) => { value?: string } | undefined;
  set?: (...args: unknown[]) => unknown;
  delete?: (...args: unknown[]) => unknown;
};

function setCookie(cookieStore: CookieStore, name: string, value: string, options: CookieOptions) {
  try {
    cookieStore.set?.(name, value, options);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[supabase][server-client] failed to set cookie', { name, error });
    }
  }
}

function removeCookie(cookieStore: CookieStore, name: string, options: CookieOptions) {
  try {
    cookieStore.delete?.(name, options);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[supabase][server-client] failed to delete cookie', { name, error });
    }
  }

  setCookie(cookieStore, name, '', { ...options, maxAge: 0 });
}

export function createServerClient(cookieStoreInput: unknown) {
  const cookieStore = cookieStoreInput as CookieStore;
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

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
