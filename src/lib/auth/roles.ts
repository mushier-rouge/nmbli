import type { SessionContext } from './session';

export function canAccessBrief(session: SessionContext | null, buyerId: string) {
  if (!session) return false;
  if (session.role === 'ops') return true;
  if (session.role === 'buyer' && session.userId === buyerId) return true;
  return false;
}

export function canManageDealer(session: SessionContext | null, dealerId?: string) {
  if (!session) return false;
  if (session.role === 'ops') return true;
  if (session.role === 'dealer' && dealerId) {
    const dealerFromMeta = session.metadata?.dealerId as string | undefined;
    if (dealerFromMeta && dealerFromMeta === dealerId) {
      return true;
    }
    if (session.impersonatedDealerId && session.impersonatedDealerId === dealerId) {
      return true;
    }
  }
  return false;
}

export function isBuyer(session: SessionContext | null) {
  return session?.role === 'buyer';
}

export function isDealer(session: SessionContext | null) {
  return session?.role === 'dealer';
}

export function isOps(session: SessionContext | null) {
  return session?.role === 'ops';
}
