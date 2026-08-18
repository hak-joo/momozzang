import { LocalAuthRepository } from './LocalAuthRepository';
import { SupabaseAuthRepository } from './SupabaseAuthRepository';
import type { AuthRepository } from './types';

/** `invitationRepositoryFactory` 와 동일한 분기 규칙을 따른다. 새 규칙을 발명하지 않는다. */
export function getAuthRepository(): AuthRepository {
  const dataSource = import.meta.env.VITE_DATA_SOURCE;

  if (dataSource === 'supabase') {
    return new SupabaseAuthRepository();
  } else {
    return new LocalAuthRepository();
  }
}
