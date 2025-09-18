import { createContext, useContext, useMemo } from 'react';
import type { WeddingInvitation } from './model';

const InvitationContext = createContext<WeddingInvitation | null>(null);

export function InvitationProvider({
  data,
  children,
}: {
  data: WeddingInvitation;
  children: React.ReactNode;
}) {
  const value = useMemo(() => data, [data]);
  return <InvitationContext.Provider value={value}>{children}</InvitationContext.Provider>;
}

export function useInvitation(): WeddingInvitation {
  const ctx = useContext(InvitationContext);
  if (!ctx) throw new Error('InvitationContext not found: wrap with <InvitationProvider>.');
  return ctx;
}
