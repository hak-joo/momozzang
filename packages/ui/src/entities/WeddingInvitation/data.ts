import type { WeddingInvitation } from './model';

export const exampleWeddingInvitation: WeddingInvitation = {
  version: '1.0.0',
  theme: 'CYWORLD',

  invitationInfo: {
    order: {
      name: '캡틴 모카',
      phone: { number: '01099990000', isInternational: false, countryCode: '+82' },
      email: 'captain.mock@example.test',
    },
    url: 'demo-captain-luna',
    title: '캡틴 모카 & 루나 픽셀의 테스트 청첩장',
    message: `이 페이지는 데모용 목업 데이터입니다.\n\n상상 속에서 만난 두 캐릭터가\n테스트와 함께 새로운 여정을 시작합니다.`,
    shareImageUrl: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22600%22%20height=%22400%22%20viewBox=%220%200%20600%20400%22%3E%3Crect%20width=%22600%22%20height=%22400%22%20fill=%22%23FFC7F3%22/%3E%3Cpath%20transform=%22translate(300%20200)%20scale(0.88)%22%20d=%22M0%2080C-110%200-60-85%200-35%2060-85%20110%200%200%2080Z%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
  },

  couple: {
    groom: {
      name: '캡틴 모카',
      phone: { number: '01011112222', isInternational: false, countryCode: '+82' },
      email: 'captain.mock@example.test',
      accounts: [
        {
          id: 'acct-groom',
          target: 'self',
          bank: '가상은행',
          accountNumber: '000-1234-567890',
          accountHolder: '캡틴 모카',
          kakaoPayEnabled: true,
          kakaoPayCode: 'MOCK-KAKAOPAY-GROOM',
        },
      ],
    },
    bride: {
      name: '루나 픽셀',
      phone: { number: '01033334444', isInternational: false, countryCode: '+82' },
      email: 'luna.pixel@example.test',
      accounts: [
        {
          id: 'acct-bride',
          target: 'self',
          bank: '샘플은행',
          accountNumber: '110-000-123456',
          accountHolder: '루나 픽셀',
          kakaoPayEnabled: true,
          kakaoPayCode: 'MOCK-KAKAOPAY-BRIDE',
        },
      ],
    },
  },

  parents: {
    enabled: true,
    groomFather: {
      name: '네온 대장',
      phone: { number: '01010101010', isInternational: false, countryCode: '+82' },
      accounts: [
        {
          id: 'acct-groom-parent',
          target: 'parent',
          bank: '테스트은행',
          accountNumber: '100-000-000000',
          accountHolder: '네온 대장',
          kakaoPayEnabled: false,
        },
      ],
    },
    groomMother: {
      name: '코랄 마녀',
      phone: { number: '01020202020', isInternational: false, countryCode: '+82' },
    },
    brideFather: {
      name: '픽셀 기사',
      phone: { number: '01030303030', isInternational: false, countryCode: '+82' },
    },
    brideMother: {
      name: '루미 여왕',
      phone: { number: '01040404040', isInternational: false, countryCode: '+82' },
    },
  },

  weddingHallInfo: {
    date: '2030-01-24',
    ampm: 'PM',
    hour: 5,
    minute: 45,
    hallName: '샘플 유니버스 웨딩홀',
    hallDetail: '테스트룸',
    lineBreakBetweenNameAndHall: true,
    tel: '000-0000-0000',
    address: '서울시 목업구 데이터로 123 (테스트타워)',
    latitude: 37.123456,
    longitude: 127.123456,
  },

  rsvpRequest: {
    enabled: true,
    title: '참석 여부를 남겨주세요 (데모)',
    content: '이 폼은 목업입니다. 자유롭게 입력해 보세요.',
    include: {
      attendeeCount: true,
      mealOption: true,
      contact: true,
      companionName: false,
      charterBus: false,
    },
    separateForBrideGroom: false,
    popupOnAccess: false,
  },

  etcInfo: {
    enabled: true,
    busInfo: {
      info: ['정류장: 목업 시티홀(가상의 정류장)'],
      subInfo: ['버스: 데모 100, 목업 200, 캐릭터 300'],
    },
    carInfo: {
      info: ['내비게이션 검색어: 목업 유니버스 웨딩홀'],
      subInfo: ['테스트 주차장 이용 가능', '입구에서 가상 주차권을 수령해 주세요.'],
    },
    metroInfo: {
      info: ['데이터선 목업역 1번 출구 (도보 5분)', '픽셀선 캐릭터역 2번 출구 (도보 8분)'],
      subInfo: [
        '출구에서 목업 표지판을 따라 200m 직진 후 좌회전',
        '테스트 분수대 지나 오른쪽 건물 3층',
      ],
    },
  },

  congratulatoryMoneyInfo: {
    enabled: true,
    cardPayment: true,
  },

  images: [
    {
      id: 'img-main',
      url: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22900%22%20height=%221200%22%20viewBox=%220%200%20900%201200%22%3E%3Crect%20width=%22900%22%20height=%221200%22%20fill=%22%23FFB9F0%22/%3E%3Ccircle%20cx=%22341%22%20cy=%22600%22%20r=%22198%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2232%22/%3E%3Ccircle%20cx=%22559%22%20cy=%22600%22%20r=%22198%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2232%22/%3E%3C/svg%3E',
      alt: '목업 메인 이미지',
      isRepresentative: true,
    },
    {
      id: 'img-share',
      url: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22600%22%20height=%22400%22%20viewBox=%220%200%20600%20400%22%3E%3Crect%20width=%22600%22%20height=%22400%22%20fill=%22%23FFD3F6%22/%3E%3Crect%20x=%22194%22%20y=%2294%22%20width=%22211%22%20height=%22211%22%20rx=%2226%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2214%22/%3E%3Ccircle%20cx=%22300%22%20cy=%22200%22%20r=%2240%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
      alt: '목업 공유용 썸네일',
      isRepresentative: false,
      isShareImage: true,
    },
  ],

  album: [
    {
      id: 'p1',
      url: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22800%22%20height=%22800%22%20viewBox=%220%200%20800%20800%22%3E%3Crect%20width=%22800%22%20height=%22800%22%20fill=%22%23FFC0F2%22/%3E%3Crect%20x=%22189%22%20y=%22189%22%20width=%22422%22%20height=%22422%22%20rx=%2253%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2228%22/%3E%3Ccircle%20cx=%22400%22%20cy=%22400%22%20r=%2279%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
      alt: '테스트 컷 1',
    },
    {
      id: 'p2',
      url: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22800%22%20height=%22800%22%20viewBox=%220%200%20800%20800%22%3E%3Crect%20width=%22800%22%20height=%22800%22%20fill=%22%23E9B4FF%22/%3E%3Ccircle%20cx=%22303%22%20cy=%22400%22%20r=%22176%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2228%22/%3E%3Ccircle%20cx=%22497%22%20cy=%22400%22%20r=%22176%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2228%22/%3E%3C/svg%3E',
      alt: '테스트 컷 2',
    },
  ],

  bgm: {
    enabled: true,
    library: [
      {
        id: 'bgm-1',
        title: 'Mock Overture',
        artist: 'Pixel Band',
        previewUrl: 'https://cdn.mock.test/bgm/mock-overture.mp3',
        license: 'free',
      },
      {
        id: 'bgm-2',
        title: 'Pixel Promise',
        artist: 'Demo Lights',
        previewUrl: 'https://cdn.mock.test/bgm/pixel-promise.mp3',
        license: 'free',
      },
    ],
    selectedTrackId: 'bgm-2',
  },

  customization: {
    enabled: true,
    themeColor: 'PINK',
    mainImageUrl: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22600%22%20height=%22800%22%20viewBox=%220%200%20600%20800%22%3E%3Crect%20width=%22600%22%20height=%22800%22%20fill=%22%23FFAEEE%22/%3E%3Ccircle%20cx=%22227%22%20cy=%22400%22%20r=%22132%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2221%22/%3E%3Ccircle%20cx=%22373%22%20cy=%22400%22%20r=%22132%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%2221%22/%3E%3C/svg%3E',
    showDDay: true,
    mood: '기쁨',
    miniRoom: {
      coupleAvatarTemplateId: 'mini-couple-01',
      roomTemplateId: 'classic-garden',
    },
  },
  aboutUs: {
    title: '데모 세계에서 만난 두 사람',
    brideDesc: '루나 픽셀은 상상 속에서 반짝이는 캐릭터로, 이 설명은 목업용입니다.',
    brideImageUrl: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22400%22%20viewBox=%220%200%20400%20400%22%3E%3Crect%20width=%22400%22%20height=%22400%22%20fill=%22%23FFC4F3%22/%3E%3Ccircle%20cx=%22200%22%20cy=%22200%22%20r=%2288%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
    groomDesc: '캡틴 모카는 데이터 바다를 항해하는 캐릭터입니다. 이 문장은 테스트용입니다.',
    groomImageUrl: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22400%22%20viewBox=%220%200%20400%20400%22%3E%3Crect%20width=%22400%22%20height=%22400%22%20fill=%22%23B6C0FF%22/%3E%3Ccircle%20cx=%22200%22%20cy=%22200%22%20r=%2288%22%20fill=%22%23FFFFFF%22/%3E%3C/svg%3E',
  },
};
