import { MOCK_GUEST_BOOKS } from '../constants';
import type { GuestBook } from '../types';

export async function fetchGuestBookList() {
  return new Promise<GuestBook[]>((resolve) => {
    return setTimeout(() => {
      const top10GuestBooks = MOCK_GUEST_BOOKS.slice(0, 10);
      resolve(top10GuestBooks);
    }, 500);
  });
}
