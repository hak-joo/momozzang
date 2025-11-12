import type { GuestBook } from './types';

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

export const DEFAULT_MINI_ME_IDS = MOCK_GUEST_BOOK_ENTRIES.map((entry) => entry.miniMeId);
