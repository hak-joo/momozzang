import { ApiGuestBookRepository } from './ApiGuestBookRepository';
import { SupabaseGuestBookRepository } from './SupabaseGuestBookRepository';
import type { GuestBookRepository } from './types';

// Singleton instances or factory logic
/**
 * 지연 싱글턴 캐시. 첫 호출 시 생성하고 이후에는 같은 인스턴스를 돌려준다.
 * 모듈 평가 시점에 즉시 생성하지 않는 이유: 생성자가 던지는 구현체가 있으면
 * 예외 시점이 첫 호출 → 모듈 로드로 앞당겨져 눈에 보이는 동작이 달라진다.
 * 생성자가 던지면 대입이 일어나지 않아 캐시가 오염되지 않고 매 호출 다시 던진다.
 */
let cachedGuestBookRepository: GuestBookRepository | undefined;

export function getGuestBookRepository(): GuestBookRepository {
  if (cachedGuestBookRepository) return cachedGuestBookRepository;

  const dataSource = import.meta.env.VITE_DATA_SOURCE;

  if (dataSource === 'supabase') {
    cachedGuestBookRepository = new SupabaseGuestBookRepository();
  } else {
    cachedGuestBookRepository = new ApiGuestBookRepository();
  }

  return cachedGuestBookRepository;
}
