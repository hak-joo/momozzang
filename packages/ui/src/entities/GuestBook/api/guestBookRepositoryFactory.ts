import { ApiGuestBookRepository } from './ApiGuestBookRepository';
import { SupabaseGuestBookRepository } from './SupabaseGuestBookRepository';
import type { GuestBookRepository } from './types';

// Singleton instances or factory logic
export function getGuestBookRepository(): GuestBookRepository {
  const dataSource = import.meta.env.VITE_DATA_SOURCE;

  if (dataSource === 'supabase') {
    return new SupabaseGuestBookRepository();
  } else {
    return new ApiGuestBookRepository();
  }
}
