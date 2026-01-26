import type { GuestBookRepository } from './types';
import type { GuestBook, SaveGuestBookPayload, DeleteGuestBookPayload } from '../model/types';

async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { expectBody?: boolean },
): Promise<T> {
  const { expectBody = true } = options ?? {};
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '방명록 요청에 실패했습니다.');
  }

  if (!expectBody || response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('방명록 응답을 해석하지 못했습니다.');
  }
}

export class ApiGuestBookRepository implements GuestBookRepository {
  async getGuestBooks({ invitationId, limit }: { invitationId: string; limit?: number }): Promise<GuestBook[]> {
    const url = limit
      ? `/api/guestbook/${invitationId}?limit=${limit}`
      : `/api/guestbook/${invitationId}`;

    return fetchJson<GuestBook[]>(url);
  }

  async saveGuestBook(payload: SaveGuestBookPayload): Promise<void> {
    const apiPayload = {
      title: 'guestbook',
      writer: payload.nickname,
      contents: payload.message,
      password: Number(payload.password),
      miniMeId: payload.miniMeId,
      weddingInvitationId: payload.invitationId,
    };

    await fetchJson(
      '/api/guestbook/save',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      },
      { expectBody: false },
    );
  }

  async deleteGuestBook({ id, password }: DeleteGuestBookPayload): Promise<void> {
    const numericPassword = Number(password);
    await fetchJson(
      `/api/guestbook/${id}/${numericPassword}`,
      { method: 'DELETE' },
      { expectBody: false },
    );
  }
}
