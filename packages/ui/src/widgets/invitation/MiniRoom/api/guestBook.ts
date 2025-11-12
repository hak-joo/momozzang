import { MOCK_GUEST_BOOK_ENTRIES } from '../constants';
import type { GuestBook } from '../types';

export async function fetchGuestBookList() {
  return new Promise<GuestBook[]>((resolve) => {
    return setTimeout(() => {
      const top10GuestBooks = MOCK_GUEST_BOOK_ENTRIES.slice(0, 10);
      resolve(top10GuestBooks);
    }, 500);
  });
}
