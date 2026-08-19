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
  accounts?: Account[];
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
  info: string[];
  subInfo?: string[];
}
export interface EtcInfo {
  enabled: boolean;
  busInfo: EtcItem;
  carInfo: EtcItem;
  metroInfo: EtcItem;
  shuttleInfo?: EtcItem;
}
export interface Account {
  id: string;
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

export type ThemeColorOptions = 'PURPLE' | 'GREEN' | 'PINK' | 'BLUE';

export interface Customization {
  enabled: boolean;
  themeColor: ThemeColorOptions; // ex) "PURPLE"
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

export interface AboutUs {
  title: string;
  brideDesc: string;
  brideImageUrl: string;
  groomDesc: string;
  groomImageUrl: string;
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

  album: AlbumPhoto[];
  bgm?: BgmSettings;
  customization?: Customization;

  aboutUs?: AboutUs;
}

/**
 * 청첩장 신청 → 승인 → 공개로 이어지는 수명주기 상태.
 * DB(`public.momozzang.status`)의 check 제약과 값이 1:1로 대응한다.
 */
export type InvitationStatus = 'pending' | 'approved' | 'rejected';

/**
 * 저장소가 돌려주는 청첩장 레코드(본문 + 수명주기 메타).
 * 편집 비밀번호 해시는 이 타입에 **존재하지 않는다** — 클라이언트로 내려보내지 않는다.
 */
export interface InvitationRecord {
  slug: string;
  status: InvitationStatus;
  data: WeddingInvitation;
  applicantContact: string;
  createdAt: string;
  approvedAt: string | null;
}

/**
 * 목록 조회용 요약 레코드. 본문(`data`)을 제외하되, 관리자가 목록에서 신청을 분류할 때 필요한
 * 최소 정보(신랑·신부 이름, 예식일)는 **요약 자체에 담는다**.
 *
 * 본문 전체를 목록에 싣지 않는다는 원칙은 그대로다 — 세 필드는 저장소 쪽에서 뽑아 오며
 * (로컬은 `toSummary`, Supabase 는 select 의 JSON 경로 추출), 목록 진입 시 슬러그별 본문
 * 조회가 새로 생기지 않는다.
 */
export type InvitationSummary = Omit<InvitationRecord, 'data'> & {
  groomName: string;
  brideName: string;
  /** `YYYY-MM-DD`. 본문 `weddingHallInfo.date` 를 그대로 옮긴다. 없으면 빈 문자열. */
  weddingDate: string;
};

/** 화면 호환용 평면 모델 (원한다면 사용) */
export type WeddingInvitationFlat = Omit<WeddingInvitation, 'couple' | 'parents'> & {
  groom: Person;
  bride: Person;
  gfather?: Person;
  gmother?: Person;
  bfather?: Person;
  bmother?: Person;
};
