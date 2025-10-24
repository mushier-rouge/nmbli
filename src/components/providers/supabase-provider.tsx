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

  const logDebug = useMemo(
    () =>
      (message: string, payload?: Record<string, unknown>) => {
        try {
          console.warn(`[SupabaseProvider] ${message}`, payload ?? {});
        } catch {
          console.warn(`[SupabaseProvider] ${message}`);
        }
      },
    []
  );

  const subscribe = useMemo(
    () =>
      (onStoreChange: () => void) => {
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
          logDebug('auth state change', {
            event: _event,
            currentAccessToken: sessionRef.current?.access_token,
            nextAccessToken: nextSession?.access_token,
            currentExpiresAt: sessionRef.current?.expires_at,
            nextExpiresAt: nextSession?.expires_at,
          });

          if (sessionsEqual(sessionRef.current, nextSession)) {
            logDebug('auth state change skipped (same session snapshot)');
            return;
          }

          sessionRef.current = nextSession;
          onStoreChange();
        });

        return () => {
          logDebug('unsubscribing auth state listener');
          subscription.unsubscribe();
        };
      },
    [client, logDebug]
  );

  const getSnapshot = () => sessionRef.current;
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  logDebug('render', {
    hasInitialSession: Boolean(initialSession),
    hasStateSession: Boolean(session),
    stateSessionEmail: session?.user?.email,
  });

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
