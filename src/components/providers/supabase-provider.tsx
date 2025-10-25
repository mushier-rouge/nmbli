'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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

function sessionsEqual(a: Session | null, b: Session | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.access_token === b.access_token &&
    a.refresh_token === b.refresh_token &&
    a.expires_at === b.expires_at &&
    a.user?.id === b.user?.id
  );
}

export function SupabaseProvider({ initialSession, children }: SupabaseProviderProps) {
  const sessionRef = useRef<Session | null>(initialSession);
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    sessionRef.current = initialSession;
  }, [initialSession]);

  const subscribe = useMemo(
    () =>
      (onStoreChange: () => void) => {
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
          if (sessionsEqual(sessionRef.current, nextSession)) {
            return;
          }

          sessionRef.current = nextSession;
          onStoreChange();
        });

        return () => {
          subscription.unsubscribe();
        };
      },
    [client]
  );

  const getSnapshot = () => sessionRef.current;
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

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
