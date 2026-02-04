import type { GuestBook, SaveGuestBookPayload, DeleteGuestBookPayload } from '../model/types';

export interface GuestBookRepository {
  getGuestBooks(params: { invitationId: string; limit?: number }): Promise<GuestBook[]>;
  saveGuestBook(payload: SaveGuestBookPayload): Promise<void>;
  deleteGuestBook(payload: DeleteGuestBookPayload): Promise<void>;
}
