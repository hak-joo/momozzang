import { LocalInvitationRepository } from './LocalInvitationRepository';
import { SupabaseInvitationRepository } from './SupabaseInvitationRepository';
import type { InvitationRepository } from './types';

export function getInvitationRepository(): InvitationRepository {
  const dataSource = import.meta.env.VITE_DATA_SOURCE;

  if (dataSource === 'supabase') {
    return new SupabaseInvitationRepository();
  } else {
    return new LocalInvitationRepository();
  }
}
