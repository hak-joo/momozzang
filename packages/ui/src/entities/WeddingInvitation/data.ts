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
      accounts: [
        {
          id: 'acct-groom',
          target: 'self',
          bank: '국민',
          accountNumber: '123401-04-567890',
          accountHolder: '이학주',
          kakaoPayEnabled: true,
          kakaoPayCode: 'KAKAOPAY-GROOM-20260418',
        },
      ],
    },
    bride: {
      name: '강민정',
      phone: { number: '01087654321', isInternational: false, countryCode: '+82' },
      email: 'minjeong@example.com',
      accounts: [
        {
          id: 'acct-bride',
          target: 'self',
          bank: '신한',
          accountNumber: '110-234-567890',
          accountHolder: '강민정',
          kakaoPayEnabled: true,
          kakaoPayCode: 'KAKAOPAY-BRIDE-20260418',
        },
      ],
    },
  },

  parents: {
    enabled: true,
    groomFather: {
      name: '김성훈',
      phone: { number: '01000001111', isInternational: false, countryCode: '+82' },
      accounts: [
        {
          id: 'acct-groom-parent',
          target: 'parent',
          bank: '우리',
          accountNumber: '1002-334-556677',
          accountHolder: '김성훈',
          kakaoPayEnabled: false,
        },
      ],
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
    busInfo: {
      info: ['정류장: 한국무역센터 삼성역 (정류장코드 23-201)'],
      subInfo: [
        '간선: 146, 333, 341, 360, 740',
        '지선: 3411',
        '광역: 6450',
        '마을: 강남07, 강남08',
        '직생: 1100, 1700, 2000, 2000-1, 7007, 500-2, 9303',
      ],
    },
    carInfo: {
      info: ['내비게이션 검색어: 한국도심공항'],
      subInfo: ['한국도심공항 터미널 주차장 이용', '축의대에서 2시간 무료 주차권 수령해 주세요.'],
    },
    metroInfo: {
      info: ['2호선 삼성역 5번 출구 (도보 7분)', '9호선 봉은사역 7번 출구 (도보 10분)'],
      subInfo: [
        '역삼역 방향 250m 직진 후 현대백화점 코너에서 우측 방향 약 150m 지점 도심공항 터미널 3층 소노펠리체 컨벤션',
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

  album: [
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
    mainImageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    showDDay: true,
    mood: '기쁨',
    miniRoom: {
      coupleAvatarTemplateId: 'mini-couple-01',
      roomTemplateId: 'classic-garden',
    },
  },
  aboutUs: {
    title: '같은 여름에 태어난 두사람',
    brideDesc: '신부 이모짱은 어떤 사람이냐면요',
    brideImageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    groomDesc: '신랑 이모짱은 어떤 사람이냐면요',
    groomImageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
  },
};
