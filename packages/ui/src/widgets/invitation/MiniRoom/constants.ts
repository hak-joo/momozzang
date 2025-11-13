import type { GuestBook } from './types';

export const MAX_MINI_ROOM_MINIS = 10;

export const DEFAULT_MINI_MESSAGES: GuestBook[] = [
  {
    id: 0,
    content: '결혼 진심으로 축하해요💕',
    from: '모모짱',
    miniMeId: 3,
  },
  {
    id: 1,
    content: '사랑 가득한 결혼생활 되길! 🩵',
    from: '모모짱',
    miniMeId: 4,
  },
  {
    id: 2,
    content: '두 사람 행복하게 오래오래 살아! 💍',
    from: '모모짱',
    miniMeId: 5,
  },
] as const;

export const DEFAULT_MINI_CHARACTERS = [
  { id: 'default-1', miniMeId: 1 },
  { id: 'default-2', miniMeId: 2 },
  { id: 'default-3', miniMeId: 4 },
  { id: 'default-4', miniMeId: 5 },
  { id: 'default-5', miniMeId: 6 },
  { id: 'default-6', miniMeId: 7 },
] as const;

export const MOCK_GUEST_BOOK_ENTRIES: GuestBook[] = [
  {
    id: 1,
    content: '모모야 결혼 너무 축하해! 두 사람의 앞날에 언제나 행복만 가득하길!',
    from: '이뫄뫄',
    miniMeId: 3,
  },
  {
    id: 2,
    content: '신혼여행도 조심히 잘 다녀오고 사진 많이 공유해줘!',
    from: '김모모',
    miniMeId: 15,
  },
  {
    id: 3,
    content: '늘 서로를 존중하며 사랑하는 부부가 되길 응원할게 :)',
    from: '동기 일동',
    miniMeId: 22,
  },
  {
    id: 4,
    content: '언제나 지금처럼만 웃는 날들만 이어져라!',
    from: '친구들',
    miniMeId: 9,
  },
  {
    id: 5,
    content: '행복한 가정 꾸리고 맛있는 밥 차려주러 놀러갈게!',
    from: '회사 동료',
    miniMeId: 28,
  },
  {
    id: 6,
    content: '사진만 봐도 두 사람의 사랑이 느껴진다 :)',
    from: '민수',
    miniMeId: 11,
  },
];
