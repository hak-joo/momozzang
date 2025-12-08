import { MOCK_GUEST_BOOK_ENTRIES } from '../constants';
import type { GuestBook } from '../types';

const TOP_LIMIT = 2;
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

function getMockGuestBooks(limit?: number): GuestBook[] {
  const items = [...MOCK_GUEST_BOOK_ENTRIES];
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

export const guestBookQueryKeys = {
  list: (invitationId?: string | null, isMock?: boolean) => [
    'guestBook',
    isMock ? 'mock' : (invitationId ?? 'none'),
    'list',
  ],
  top: (invitationId?: string | null, isMock?: boolean) => [
    'guestBook',
    isMock ? 'mock' : (invitationId ?? 'none'),
    'top',
  ],
  detail: (id: number, password: string | number, isMock?: boolean) => [
    'guestBook',
    isMock ? 'mock' : id,
    'detail',
    password,
  ],
} as const;

interface GuestBookListParams {
  invitationId?: string | null;
  isMock?: boolean;
  isTop?: boolean;
}

export async function fetchGuestBookList({
  invitationId,
  isMock,
  isTop,
}: GuestBookListParams): Promise<GuestBook[]> {
  if (isMock || !invitationId) {
    return getMockGuestBooks(TOP_LIMIT);
  }

  const url = isTop
    ? `/api/guestbook/${invitationId}?limit=${TOP_LIMIT}`
    : `/api/guestbook/${invitationId}`;

  const data = await fetchJson<GuestBook[]>(url);

  return data;
}

export async function fetchTopGuestBookList({
  invitationId,
  isMock,
}: {
  invitationId?: string | null;
  isMock?: boolean;
}): Promise<GuestBook[]> {
  return fetchGuestBookList({ invitationId, isMock });
}

interface SaveGuestBookPayload {
  invitationId?: string | null;
  miniMeId: number;
  nickname: string;
  message: string;
  password: string;
  isMock?: boolean;
}

export async function saveGuestBook({
  invitationId,
  miniMeId,
  nickname,
  message,
  password,
  isMock,
}: SaveGuestBookPayload) {
  if (isMock || !invitationId) return;

  const payload = {
    title: 'guestbook',
    writer: nickname,
    contents: message,
    password: Number(password),
    miniMeId: miniMeId,
    weddingInvitationId: invitationId,
  };

  await fetchJson(
    '/api/guestbook/save',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { expectBody: false },
  );
}

export async function deleteGuestBook({
  id,
  password,
  isMock,
}: {
  id: number;
  password: string;
  isMock?: boolean;
}) {
  if (isMock) return;
  const numericPassword = Number(password);
  await fetchJson(
    `/api/guestbook/${id}/${numericPassword}`,
    { method: 'DELETE' },
    { expectBody: false },
  );
}
