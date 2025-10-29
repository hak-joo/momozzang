import type { WeddingInvitation } from './model';

export const exampleWeddingInvitation: WeddingInvitation = {
  version: '1.0.0',
  theme: 'CYWORLD',

  invitationInfo: {
    order: {
      name: '이학주',
      phone: { number: '01012345678', isInternational: false, countryCode: '+82' },
      email: 'hakjoo@example.com',
    },
    url: 'hakjoo-minjeong',
    title: '학주 & 민정의 모바일 청첩장',
    message: `소중한 분들을 초대합니다.\n\n앞으로 평생 함께하고 싶은 사람을 만나,\n연인에서 부부로\n새로운 시작을 하려고 합니다.
      `,
    shareImageUrl: 'https://cdn.example.com/invitations/hakjoo-minjeong/share.jpg',
  },

  couple: {
    groom: {
      name: '이학주',
      phone: { number: '01012345678', isInternational: false, countryCode: '+82' },
      email: 'hakjoo@example.com',
    },
    bride: {
      name: '강민정',
      phone: { number: '01087654321', isInternational: false, countryCode: '+82' },
      email: 'minjeong@example.com',
    },
  },

  parents: {
    enabled: true,
    groomFather: {
      name: '김성훈',
      phone: { number: '01000001111', isInternational: false, countryCode: '+82' },
    },
    groomMother: {
      name: '박지영',
      phone: { number: '01000002222', isInternational: false, countryCode: '+82' },
    },
    brideFather: {
      name: '이강민',
      phone: { number: '01000003333', isInternational: false, countryCode: '+82' },
    },
    brideMother: {
      name: '최은주',
      phone: { number: '01000004444', isInternational: false, countryCode: '+82' },
    },
  },

  weddingHallInfo: {
    date: '2026-04-05',
    ampm: 'PM',
    hour: 12,
    minute: 30,
    hallName: '경기교총 웨딩하우스',
    hallDetail: '베네치아홀',
    lineBreakBetweenNameAndHall: true,
    tel: '031-256-0700',
    address: '경기도 수원시 팔달구 매산로1가 89-13',
    latitude: 37.2767981,
    longitude: 127.0075225,
  },

  rsvpRequest: {
    enabled: true,
    title: '참석 여부를 알려주세요',
    content: '원활한 준비를 위해 참석 인원과 식사 여부 등을 입력 부탁드립니다.',
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
    busInfo: '대절버스는 수원역 5번 출구 앞에서 12:20 출발',
    carInfo: '주차는 지하 2~4층 이용 가능(2시간 무료)',
    atmInfo: '1층 로비 ATM 이용 가능',
    additionalItems: [{ id: 'etc-1', label: '드레스 코드', value: '봄 컬러 포멀' }],
  },

  congratulatoryMoneyInfo: {
    enabled: true,
    cardPayment: true,
    accounts: [
      {
        id: 'acct-groom',
        side: 'groom',
        target: 'self',
        bank: '국민',
        accountNumber: '123401-04-567890',
        accountHolder: '이학주',
        kakaoPayEnabled: true,
        kakaoPayCode: 'KAKAOPAY-GROOM-20260418',
      },
      {
        id: 'acct-bride',
        side: 'bride',
        target: 'self',
        bank: '신한',
        accountNumber: '110-234-567890',
        accountHolder: '강민정',
        kakaoPayEnabled: true,
        kakaoPayCode: 'KAKAOPAY-BRIDE-20260418',
      },
      {
        id: 'acct-groom-parent',
        side: 'groom',
        target: 'parent',
        bank: '우리',
        accountNumber: '1002-334-556677',
        accountHolder: '김성훈',
        kakaoPayEnabled: false,
      },
    ],
  },

  images: [
    {
      id: 'img-main',
      url: 'https://cdn.example.com/invitations/hakjoo-minjeong/main.jpg',
      alt: '메인 이미지',
      isRepresentative: true,
    },
    {
      id: 'img-share',
      url: 'https://cdn.example.com/invitations/hakjoo-minjeong/share.jpg',
      alt: '공유용 썸네일',
      isRepresentative: false,
      isShareImage: true,
    },
  ],

  album: {
    enabled: true,
    maxCount: 20,
    photos: [
      {
        id: 'p1',
        url: 'https://cdn.example.com/invitations/hakjoo-minjeong/photo-01.jpg',
        alt: '프리웨딩 메인 컷',
      },
      {
        id: 'p2',
        url: 'https://cdn.example.com/invitations/hakjoo-minjeong/photo-02.jpg',
        alt: '야외 촬영 컷',
      },
    ],
  },

  bgm: {
    enabled: true,
    library: [
      {
        id: 'bgm-1',
        title: 'Spring Light',
        artist: 'Studio Free',
        previewUrl: 'https://cdn.example.com/bgm/spring-light.mp3',
        license: 'free',
      },
      {
        id: 'bgm-2',
        title: 'Promise',
        artist: 'Lumen',
        previewUrl: 'https://cdn.example.com/bgm/promise.mp3',
        license: 'free',
      },
    ],
    selectedTrackId: 'bgm-2',
  },

  customization: {
    enabled: true,
    themeColor: '#F1FDF3',
    mainImageUrl: 'https://cdn.example.com/invitations/hakjoo-minjeong/main.jpg',
    showDDay: true,
    mood: '기쁨',
    miniRoom: {
      coupleAvatarTemplateId: 'mini-couple-01',
      roomTemplateId: 'room-spring-01',
    },
  },
};
