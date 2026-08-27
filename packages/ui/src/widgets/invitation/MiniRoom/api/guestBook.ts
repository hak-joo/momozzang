import { MOCK_GUEST_BOOK_ENTRIES } from '../constants';
import type { GuestBook } from '../types';
import { getGuestBookRepository } from '../../../../entities/GuestBook/api/guestBookRepositoryFactory';

const TOP_LIMIT = 2;

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

  const repo = getGuestBookRepository();
  const limit = isTop ? TOP_LIMIT : undefined;
  
  // 엔티티 GuestBook 은 위젯 GuestBook 의 상위집합이므로(weddingInvitationId·date 초과)
  // 구조적으로 대입 가능하다. 초과 프로퍼티 검사는 fresh 객체 리터럴에만 적용되므로
  // 이중 단언 없이 그대로 반환한다.
  const data = await repo.getGuestBooks({ invitationId, limit });
  
  return data;
}

export async function fetchTopGuestBookList({
  invitationId,
  isMock,
}: {
  invitationId?: string | null;
  isMock?: boolean;
}): Promise<GuestBook[]> {
  return fetchGuestBookList({ invitationId, isMock, isTop: true });
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

  const repo = getGuestBookRepository();
  await repo.saveGuestBook({
    invitationId,
    miniMeId,
    nickname,
    message,
    password,
    isMock
  });
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

  const repo = getGuestBookRepository();
  await repo.deleteGuestBook({ id, password, isMock });
}
