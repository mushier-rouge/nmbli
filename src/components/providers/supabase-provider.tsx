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
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG][SupabaseProvider] auth state change', {
              event: _event,
              hasSession: Boolean(nextSession),
              sessionEmail: nextSession?.user?.email,
              timestamp: new Date().toISOString(),
            });
          }
          const currentToken = sessionRef.current?.access_token ?? null;
          const nextToken = nextSession?.access_token ?? null;
          if (currentToken === nextToken && sessionRef.current === nextSession) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG][SupabaseProvider] auth state change skipped (no session delta)');
            }
            return;
          }
          sessionRef.current = nextSession;
          onStoreChange();
        });

        return () => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG][SupabaseProvider] unsubscribing auth state listener');
          }
          subscription.unsubscribe();
        };
      },
    [client]
  );

  const getSnapshot = () => sessionRef.current;
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG][SupabaseProvider] render', {
      hasInitialSession: Boolean(initialSession),
      hasStateSession: Boolean(session),
      stateSessionEmail: session?.user?.email,
      timestamp: new Date().toISOString(),
    });
  }

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
