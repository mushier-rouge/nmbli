'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface SupabaseContextValue {
  client: SupabaseClient;
  session: Session | null;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

interface SupabaseProviderProps {
  initialSession: Session | null;
  children: React.ReactNode;
}

export function SupabaseProvider({ initialSession, children }: SupabaseProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [client]);

  return (
    <SupabaseContext.Provider
      value={{
        client,
        session,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}
