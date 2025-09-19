// type.ts
// 모바일 청첩장 타입 (테마 포함)

export type ThemeKind = 'CYWORLD' | 'RETRO';
export type DeceaseType = 'flower' | 'hanja' | 'none';
export type Side = 'groom' | 'bride';
export type AmPm = 'AM' | 'PM';
export type DepositTarget = 'self' | 'parent' | 'custom';

export interface Phone {
  number: string; // 하이픈 없는 번호
  isInternational: boolean; // 국제 전화 여부
  countryCode: string; // 기본: +82
}

export interface Person {
  name: string;
  phone: Phone;
  email?: string;
  isDeceased?: boolean;
  deceasedType?: DeceaseType;
}

export interface InvitationInfo {
  order: Person; // 주문자
  url: string; // 초대장 URL 또는 슬러그
  title: string; // 초대장 제목(SNS 공유 메인 텍스트 포함)
  message: string; // 청첩장 문구
  shareImageUrl?: string; // 카카오/SMS 공유용(선택)
}

export interface ImageAsset {
  id: string;
  url: string;
  alt?: string;
  isRepresentative: boolean; // 대표 이미지 여부
  isShareImage?: boolean; // 공유 이미지 여부
}

export interface WeddingHallInfo {
  date: string; // YYYY-MM-DD
  ampm: AmPm;
  hour: number; // 1~12
  minute: number; // 0~59
  hallName: string; // 예식장명
  hallDetail: string; // 층/홀/실
  lineBreakBetweenNameAndHall: boolean;
  tel: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RsvpIncludeToggles {
  attendeeCount: boolean;
  mealOption: boolean;
  contact: boolean;
  companionName: boolean;
  charterBus: boolean;
}

export interface RsvpSideFields {
  title?: string;
  content?: string;
  include?: Partial<RsvpIncludeToggles>;
}

export interface RsvpSettings {
  enabled: boolean; // 사용 여부
  title?: string; // 공통 제목
  content?: string; // 공통 내용
  include: RsvpIncludeToggles; // 공통 포함 항목 토글
  separateForBrideGroom: boolean; // 신랑/신부 분리 설정
  popupOnAccess: boolean; // 접속 시 팝업
  perSide?: {
    // 분리 사용 시 개별 설정
    groom?: RsvpSideFields;
    bride?: RsvpSideFields;
  };
}

export interface EtcItem {
  id: string;
  label: string;
  value: string;
}
export interface EtcInfo {
  enabled: boolean;
  busInfo?: string;
  carInfo?: string;
  atmInfo?: string;
  additionalItems: EtcItem[];
}

export interface GiftAccount {
  id: string;
  side: Side; // 신랑/신부 측
  target: DepositTarget; // self | parent | custom
  customLabel?: string; // custom 라벨
  bank: string;
  accountNumber: string;
  accountHolder: string;
  kakaoPayEnabled: boolean;
  kakaoPayCode?: string;
}

export interface GiftMoneySettings {
  enabled: boolean;
  cardPayment: boolean;
  accounts: GiftAccount[]; // 복수 계좌
}

export interface AlbumPhoto {
  id: string;
  url: string;
  alt?: string;
}
export interface AlbumSettings {
  enabled: boolean;
  maxCount: number; // 기본 20
  photos: AlbumPhoto[];
}

export interface BgmTrack {
  id: string;
  title: string;
  artist?: string;
  previewUrl: string;
  license: 'free' | 'paid' | 'custom';
}
export interface BgmSettings {
  enabled: boolean;
  library: BgmTrack[];
  selectedTrackId?: string;
}

export interface Customization {
  enabled: boolean;
  themeColor: string; // ex) "#F1FDF3"
  mainImageUrl: string; // 메인 이미지(대표 대신 유지)
  showDDay: boolean;
  mood?: '설렘' | '기대' | '기쁨' | '즐거움' | '감사' | '행복';
  miniRoom?: {
    coupleAvatarTemplateId?: string;
    roomTemplateId?: string;
  };
}

export interface Parents {
  enabled: boolean;
  groomFather?: Person;
  groomMother?: Person;
  brideFather?: Person;
  brideMother?: Person;
  others?: Array<{ side: Side; relationLabel: string; person: Person }>;
}

export interface WeddingInvitation {
  version: string;
  theme: ThemeKind;

  invitationInfo: InvitationInfo;

  couple: {
    groom: Person;
    bride: Person;
  };

  parents: Parents;

  weddingHallInfo: WeddingHallInfo;
  rsvpRequest: RsvpSettings;
  etcInfo: EtcInfo;
  congratulatoryMoneyInfo: GiftMoneySettings;

  images: ImageAsset[];

  album?: AlbumSettings;
  bgm?: BgmSettings;
  customization?: Customization;
}

/** 화면 호환용 평면 모델 (원한다면 사용) */
export type WeddingInvitationFlat = Omit<WeddingInvitation, 'couple' | 'parents'> & {
  groom: Person;
  bride: Person;
  gfather?: Person;
  gmother?: Person;
  bfather?: Person;
  bmother?: Person;
};
