import { useCallback, useMemo, useRef, useState } from 'react';
import { exampleWeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/data';
import {
  type WeddingInvitation,
  type ThemeKind,
  type ThemeColorOptions,
  type AmPm,
  type Person,
  type Account,
  type Side,
  type EtcInfo,
  type EtcItem,
  type Parents,
  type RsvpSettings,
  type AboutUs,
  type AlbumPhoto,
  type BgmSettings,
  type BgmTrack,
  type Customization,
  type ImageAsset,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import {
  usePendingImages,
  type ApplyUploadedKey,
} from '../invitation/usePendingImages';
import { createPhotoId } from '../invitation/galleryHelpers';

/** 혼주 4인 슬롯 키 (Parents의 Person 필드) */
export type ParentSlot = 'groomFather' | 'groomMother' | 'brideFather' | 'brideMother';

/** 계좌가 붙는 소유자 — 신랑/신부 본인 또는 혼주 4인 */
export type AccountOwner = { kind: 'couple'; side: Side } | { kind: 'parent'; slot: ParentSlot };

/** 교통 안내 종류 (셔틀 포함) */
export type EtcKey = 'busInfo' | 'carInfo' | 'metroInfo' | 'shuttleInfo';

/** 교통 안내 배열 종류 — info(본문) / subInfo(보조) */
export type EtcField = 'info' | 'subInfo';

let accountIdSeq = 0;
function createAccountId(): string {
  accountIdSeq += 1;
  return `acct-form-${Date.now().toString(36)}-${accountIdSeq}`;
}

function emptyAccount(): Account {
  return {
    id: createAccountId(),
    target: 'self',
    bank: '',
    accountNumber: '',
    accountHolder: '',
    kakaoPayEnabled: false,
  };
}

function emptyPerson(): Person {
  return {
    name: '',
    phone: { number: '', isInternational: false, countryCode: '+82' },
  };
}

const DEFAULT_RSVP: RsvpSettings = {
  enabled: false,
  title: '',
  content: '',
  include: {
    attendeeCount: false,
    mealOption: false,
    contact: false,
    companionName: false,
    charterBus: false,
  },
  separateForBrideGroom: false,
  popupOnAccess: false,
};

const DEFAULT_ABOUT_US: AboutUs = {
  title: '',
  groomDesc: '',
  groomImageUrl: '',
  brideDesc: '',
  brideImageUrl: '',
};

function defaultCustomization(prev: Customization | undefined): Customization {
  return {
    enabled: prev?.enabled ?? true,
    themeColor: prev?.themeColor ?? 'PURPLE',
    mainImageUrl: prev?.mainImageUrl ?? '',
    showDDay: prev?.showDDay ?? true,
    ...prev,
  };
}

const DEFAULT_BGM: BgmSettings = {
  enabled: false,
  library: [],
};

/** 무드 선택지 (F12) */
export const MOOD_OPTIONS = ['설렘', '기대', '기쁨', '즐거움', '감사', '행복'] as const;
export type Mood = (typeof MOOD_OPTIONS)[number];

/** 단일 이미지 슬롯 종류 */
export type SingleImageSlot = 'main' | 'share' | 'representative' | 'aboutGroom' | 'aboutBride';

/** 신청 폼 단일 5슬롯 집합. 이 5개에 속하지 않는 slotKey 는 갤러리 항목 id(UUID)로 본다. */
const SINGLE_IMAGE_SLOT_SET = new Set<SingleImageSlot>([
  'main',
  'share',
  'representative',
  'aboutGroom',
  'aboutBride',
]);

/**
 * 신청 폼 전용 applyKey([E4]). 어드민 `applyUploadedKey`(main/share/groom/bride)와 슬롯 키가 다르므로
 * 별도로 작성한다. `setSingleImage`(아래) switch 매핑과 동일하게 업로드 결과 키를 invitation 에 꽂는다.
 * - main → customization.mainImageUrl
 * - share → invitationInfo.shareImageUrl
 * - aboutGroom → aboutUs.groomImageUrl
 * - aboutBride → aboutUs.brideImageUrl
 * - representative → images[]의 isRepresentative 자산 url 치환/추가
 * - 그 외(갤러리 항목 id) → album 에서 같은 id 항목의 url 만 치환(id 유지).
 * blob 이 아니라 업로드된 "키"만 들어간다(불변식 1).
 */
const applyFormUploadedKey: ApplyUploadedKey = (invitation, slotKey, key) => {
  if (!SINGLE_IMAGE_SLOT_SET.has(slotKey as SingleImageSlot)) {
    // 갤러리 항목: album 에서 slotKey(=항목 id)를 찾아 url 만 치환, id 유지.
    const album = invitation.album ?? [];
    return {
      ...invitation,
      album: album.map((item) => (item.id === slotKey ? { ...item, url: key } : item)),
    };
  }
  // 단일 슬롯: setSingleImage 와 동일 매핑을 키 치환에 재사용.
  return applySingleImage(invitation, slotKey as SingleImageSlot, key);
};

/** 신청 폼 prefix 분기: 단일 5슬롯=admin, 그 외(갤러리 항목 id)=gallery. */
const applyFormUploadPrefix = (slotKey: string): 'admin' | 'gallery' =>
  SINGLE_IMAGE_SLOT_SET.has(slotKey as SingleImageSlot) ? 'admin' : 'gallery';

/** 단일 슬롯의 현재 저장값(키/URL)을 invitation 에서 꺼낸다. 썸네일/미리보기 src 조립용. */
function singleSlotSavedValue(
  invitation: WeddingInvitation,
  slot: SingleImageSlot,
): string | undefined {
  switch (slot) {
    case 'main':
      return invitation.customization?.mainImageUrl || undefined;
    case 'share':
      return invitation.invitationInfo.shareImageUrl || undefined;
    case 'aboutGroom':
      return invitation.aboutUs?.groomImageUrl || undefined;
    case 'aboutBride':
      return invitation.aboutUs?.brideImageUrl || undefined;
    case 'representative':
      return invitation.images?.find((img) => img.isRepresentative)?.url || undefined;
    default:
      return undefined;
  }
}

/**
 * 단일 슬롯에 url(=즉시 입력 또는 commit 후 업로드 키)을 불변 갱신해 반환한다.
 * `setSingleImage`(state setter)와 `applyFormUploadedKey`(commit 키 치환)가 공유하는 단일 매핑.
 */
function applySingleImage(
  prev: WeddingInvitation,
  slot: SingleImageSlot,
  url: string,
): WeddingInvitation {
  switch (slot) {
    case 'main':
      return {
        ...prev,
        customization: { ...defaultCustomization(prev.customization), mainImageUrl: url },
      };
    case 'share':
      return { ...prev, invitationInfo: { ...prev.invitationInfo, shareImageUrl: url } };
    case 'aboutGroom':
      return { ...prev, aboutUs: { ...(prev.aboutUs ?? DEFAULT_ABOUT_US), groomImageUrl: url } };
    case 'aboutBride':
      return { ...prev, aboutUs: { ...(prev.aboutUs ?? DEFAULT_ABOUT_US), brideImageUrl: url } };
    case 'representative': {
      // images[]에서 isRepresentative 자산을 갱신/추가한다.
      const existing = prev.images ?? [];
      const repIndex = existing.findIndex((img) => img.isRepresentative);
      let nextImages: ImageAsset[];
      if (repIndex >= 0) {
        nextImages = existing.map((img, i) => (i === repIndex ? { ...img, url } : img));
      } else {
        const newAsset: ImageAsset = {
          id: `rep-${Date.now().toString(36)}`,
          url,
          isRepresentative: true,
        };
        nextImages = [...existing, newAsset];
      }
      return { ...prev, images: nextImages };
    }
    default:
      return prev;
  }
}

/**
 * 신청 폼 단일 진실원천.
 * 폼 상태는 `WeddingInvitation` 객체 1개이며, 모든 setter는 새 객체 참조를 반환하는
 * 불변 업데이트로 동작한다 → `InvitationProvider`(useMemo([data]))가 재렌더되어 미리보기가 즉시 갱신된다.
 */
export function useApplyForm() {
  // 깊은 복사로 시드(공유 상수)를 직접 변형하지 않도록 한다.
  const [invitation, setInvitation] = useState<WeddingInvitation>(() =>
    structuredClone(exampleWeddingInvitation),
  );

  // ── 지연 업로드 pending 레이어(F1·F2·F5·F7·F8) ──────────────────────────────
  // 신청 폼 전체에서 단 1개의 인스턴스를 보유한다(F8). ImageStep(스텝②)·PublishStep(스텝③)이
  // 이 동일 인스턴스의 콜백을 주입받으므로, 스텝을 오가며 ImageStep 이 언마운트돼도 pending 은
  // ApplyPage 최상위(useApplyForm)에 살아남는다 → 고른 사진이 유지된다(F8).
  const {
    setPending,
    clearPending,
    getPreviewUrl,
    hasPending,
    pendingCount,
    commitPendingUploads: commitPending,
    clearAfterCommit,
  } = usePendingImages();

  // ── 기본 정보 / 신랑·신부 이름 / 예식 / 테마 (S1) ───────────────────────────
  const setInvitationInfo = useCallback((patch: Partial<WeddingInvitation['invitationInfo']>) => {
    setInvitation((prev) => ({
      ...prev,
      invitationInfo: { ...prev.invitationInfo, ...patch },
    }));
  }, []);

  const setGroomName = useCallback((name: string) => {
    setInvitation((prev) => ({
      ...prev,
      couple: { ...prev.couple, groom: { ...prev.couple.groom, name } },
    }));
  }, []);

  const setBrideName = useCallback((name: string) => {
    setInvitation((prev) => ({
      ...prev,
      couple: { ...prev.couple, bride: { ...prev.couple.bride, name } },
    }));
  }, []);

  const setWeddingHall = useCallback((patch: Partial<WeddingInvitation['weddingHallInfo']>) => {
    setInvitation((prev) => ({
      ...prev,
      weddingHallInfo: { ...prev.weddingHallInfo, ...patch },
    }));
  }, []);

  const setTheme = useCallback((theme: ThemeKind) => {
    setInvitation((prev) => ({ ...prev, theme }));
  }, []);

  const setThemeColor = useCallback((themeColor: ThemeColorOptions) => {
    setInvitation((prev) => ({
      ...prev,
      customization: {
        enabled: prev.customization?.enabled ?? true,
        mainImageUrl: prev.customization?.mainImageUrl ?? '',
        showDDay: prev.customization?.showDDay ?? true,
        ...prev.customization,
        themeColor,
      },
    }));
  }, []);

  // ── F3: 주문자 정보 (invitationInfo.order) ─────────────────────────────────
  const setOrder = useCallback((patch: Partial<Person>) => {
    setInvitation((prev) => ({
      ...prev,
      invitationInfo: {
        ...prev.invitationInfo,
        order: { ...prev.invitationInfo.order, ...patch },
      },
    }));
  }, []);

  const setOrderPhone = useCallback((patch: Partial<Person['phone']>) => {
    setInvitation((prev) => ({
      ...prev,
      invitationInfo: {
        ...prev.invitationInfo,
        order: {
          ...prev.invitationInfo.order,
          phone: { ...prev.invitationInfo.order.phone, ...patch },
        },
      },
    }));
  }, []);

  // ── F4: 신랑·신부 연락처 (phone/email) ─────────────────────────────────────
  const setCouplePerson = useCallback((side: Side, patch: Partial<Person>) => {
    setInvitation((prev) => ({
      ...prev,
      couple: { ...prev.couple, [side]: { ...prev.couple[side], ...patch } },
    }));
  }, []);

  const setCouplePhone = useCallback((side: Side, patch: Partial<Person['phone']>) => {
    setInvitation((prev) => ({
      ...prev,
      couple: {
        ...prev.couple,
        [side]: { ...prev.couple[side], phone: { ...prev.couple[side].phone, ...patch } },
      },
    }));
  }, []);

  // ── F5: 혼주 (parents) ─────────────────────────────────────────────────────
  const setParentsEnabled = useCallback((enabled: boolean) => {
    setInvitation((prev) => ({ ...prev, parents: { ...prev.parents, enabled } }));
  }, []);

  const setParentPerson = useCallback((slot: ParentSlot, patch: Partial<Person>) => {
    setInvitation((prev) => {
      const current = prev.parents[slot] ?? emptyPerson();
      return {
        ...prev,
        parents: { ...prev.parents, [slot]: { ...current, ...patch } },
      };
    });
  }, []);

  const setParentPhone = useCallback((slot: ParentSlot, patch: Partial<Person['phone']>) => {
    setInvitation((prev) => {
      const current = prev.parents[slot] ?? emptyPerson();
      return {
        ...prev,
        parents: {
          ...prev.parents,
          [slot]: { ...current, phone: { ...current.phone, ...patch } },
        },
      };
    });
  }, []);

  // ── 계좌 CRUD (F4 신랑/신부 · F5 혼주 공통) ────────────────────────────────
  const updateOwnerAccounts = useCallback(
    (owner: AccountOwner, updater: (accounts: Account[]) => Account[]) => {
      setInvitation((prev) => {
        if (owner.kind === 'couple') {
          const person = prev.couple[owner.side];
          return {
            ...prev,
            couple: {
              ...prev.couple,
              [owner.side]: { ...person, accounts: updater(person.accounts ?? []) },
            },
          };
        }
        const person = prev.parents[owner.slot] ?? emptyPerson();
        return {
          ...prev,
          parents: {
            ...prev.parents,
            [owner.slot]: { ...person, accounts: updater(person.accounts ?? []) },
          },
        };
      });
    },
    [],
  );

  const addAccount = useCallback(
    (owner: AccountOwner) => {
      updateOwnerAccounts(owner, (accounts) => [...accounts, emptyAccount()]);
    },
    [updateOwnerAccounts],
  );

  const removeAccount = useCallback(
    (owner: AccountOwner, accountId: string) => {
      updateOwnerAccounts(owner, (accounts) => accounts.filter((a) => a.id !== accountId));
    },
    [updateOwnerAccounts],
  );

  const updateAccount = useCallback(
    (owner: AccountOwner, accountId: string, patch: Partial<Account>) => {
      updateOwnerAccounts(owner, (accounts) =>
        accounts.map((a) => (a.id === accountId ? { ...a, ...patch } : a)),
      );
    },
    [updateOwnerAccounts],
  );

  // ── F9: 축의금 옵션 (congratulatoryMoneyInfo) ──────────────────────────────
  const setGiftMoney = useCallback((patch: Partial<WeddingInvitation['congratulatoryMoneyInfo']>) => {
    setInvitation((prev) => ({
      ...prev,
      congratulatoryMoneyInfo: { ...prev.congratulatoryMoneyInfo, ...patch },
    }));
  }, []);

  // ── F8: 교통/기타 안내 (etcInfo) ───────────────────────────────────────────
  const setEtcEnabled = useCallback((enabled: boolean) => {
    setInvitation((prev) => ({ ...prev, etcInfo: { ...prev.etcInfo, enabled } }));
  }, []);

  const updateEtcItem = useCallback(
    (key: EtcKey, updater: (item: EtcItem) => EtcItem) => {
      setInvitation((prev) => {
        const current: EtcItem = prev.etcInfo[key] ?? { info: [], subInfo: [] };
        return {
          ...prev,
          etcInfo: { ...prev.etcInfo, [key]: updater(current) },
        };
      });
    },
    [],
  );

  const addEtcLine = useCallback(
    (key: EtcKey, field: EtcField) => {
      updateEtcItem(key, (item) => ({
        ...item,
        [field]: [...(item[field] ?? []), ''],
      }));
    },
    [updateEtcItem],
  );

  const updateEtcLine = useCallback(
    (key: EtcKey, field: EtcField, index: number, value: string) => {
      updateEtcItem(key, (item) => {
        const arr = [...(item[field] ?? [])];
        arr[index] = value;
        return { ...item, [field]: arr };
      });
    },
    [updateEtcItem],
  );

  const removeEtcLine = useCallback(
    (key: EtcKey, field: EtcField, index: number) => {
      updateEtcItem(key, (item) => ({
        ...item,
        [field]: (item[field] ?? []).filter((_, i) => i !== index),
      }));
    },
    [updateEtcItem],
  );

  // ── F7: RSVP (rsvpRequest) ─────────────────────────────────────────────────
  const setRsvp = useCallback((patch: Partial<RsvpSettings>) => {
    setInvitation((prev) => ({
      ...prev,
      rsvpRequest: { ...(prev.rsvpRequest ?? DEFAULT_RSVP), ...patch },
    }));
  }, []);

  const setRsvpInclude = useCallback(
    (patch: Partial<RsvpSettings['include']>) => {
      setInvitation((prev) => {
        const base = prev.rsvpRequest ?? DEFAULT_RSVP;
        return {
          ...prev,
          rsvpRequest: { ...base, include: { ...base.include, ...patch } },
        };
      });
    },
    [],
  );

  const setRsvpPerSide = useCallback(
    (side: Side, patch: Partial<NonNullable<RsvpSettings['perSide']>[Side]>) => {
      setInvitation((prev) => {
        const base = prev.rsvpRequest ?? DEFAULT_RSVP;
        const perSide = base.perSide ?? {};
        const current = perSide[side] ?? {};
        return {
          ...prev,
          rsvpRequest: {
            ...base,
            perSide: { ...perSide, [side]: { ...current, ...patch } },
          },
        };
      });
    },
    [],
  );

  const setRsvpPerSideInclude = useCallback(
    (side: Side, patch: Partial<RsvpSettings['include']>) => {
      setInvitation((prev) => {
        const base = prev.rsvpRequest ?? DEFAULT_RSVP;
        const perSide = base.perSide ?? {};
        const current = perSide[side] ?? {};
        return {
          ...prev,
          rsvpRequest: {
            ...base,
            perSide: {
              ...perSide,
              [side]: { ...current, include: { ...current.include, ...patch } },
            },
          },
        };
      });
    },
    [],
  );

  // ── F13: 소개 (aboutUs) ────────────────────────────────────────────────────
  const setAboutUs = useCallback((patch: Partial<AboutUs>) => {
    setInvitation((prev) => ({
      ...prev,
      aboutUs: { ...(prev.aboutUs ?? DEFAULT_ABOUT_US), ...patch },
    }));
  }, []);

  // ── F10: 단일 이미지 슬롯 (대표/공유/메인/소개) ─────────────────────────────
  // (즉시 url 치환 setter — 키 매핑은 모듈 함수 applySingleImage 와 공유한다.)
  const setSingleImage = useCallback((slot: SingleImageSlot, url: string) => {
    setInvitation((prev) => applySingleImage(prev, slot, url));
  }, []);

  // ── F10: 갤러리 album ───────────────────────────────────────────────────────
  const setAlbum = useCallback((newAlbum: AlbumPhoto[]) => {
    setInvitation((prev) => ({ ...prev, album: newAlbum }));
  }, []);

  // ── F11: BGM (bgm) ──────────────────────────────────────────────────────────
  const setBgm = useCallback((patch: Partial<BgmSettings>) => {
    setInvitation((prev) => ({
      ...prev,
      bgm: { ...(prev.bgm ?? DEFAULT_BGM), ...patch },
    }));
  }, []);

  const selectTrack = useCallback((trackId: string) => {
    setInvitation((prev) => ({
      ...prev,
      bgm: { ...(prev.bgm ?? DEFAULT_BGM), selectedTrackId: trackId },
    }));
  }, []);

  const updateTrack = useCallback((trackId: string, patch: Partial<BgmTrack>) => {
    setInvitation((prev) => {
      const base = prev.bgm ?? DEFAULT_BGM;
      return {
        ...prev,
        bgm: {
          ...base,
          library: base.library.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
        },
      };
    });
  }, []);

  // ── F12: 커스터마이즈 잔여 (enabled/showDDay/mood) + 미니룸 ─────────────────
  const setCustomization = useCallback((patch: Partial<Customization>) => {
    setInvitation((prev) => ({
      ...prev,
      customization: { ...defaultCustomization(prev.customization), ...patch },
    }));
  }, []);

  const setMiniRoom = useCallback(
    (patch: Partial<NonNullable<Customization['miniRoom']>>) => {
      setInvitation((prev) => {
        const base = defaultCustomization(prev.customization);
        return {
          ...prev,
          customization: { ...base, miniRoom: { ...base.miniRoom, ...patch } },
        };
      });
    },
    [],
  );

  // ── F14: 불러오기 — 폼 전체를 불러온 데이터로 교체 ──────────────────────────
  const loadInvitation = useCallback((data: WeddingInvitation) => {
    setInvitation(structuredClone(data));
  }, []);

  // ── 단일 5슬롯 지연 선택(F1·F2·F5) — 업로드 없이 pending 에 보관만 ─────────────
  // ImageStep 의 즉시 업로드(resizeAndUploadImage)를 대체한다. invitation state 는 건드리지 않는다
  // (불변식 1: state·저장값에 blob 없음). blob 은 pending 레이어에만 존재.
  const setSingleImagePending = useCallback(
    (slot: SingleImageSlot, file: File) => {
      setPending(slot, file); // (revoke 지점 a) 재선택 시 이전 previewUrl 해제는 setPending 내부.
    },
    [setPending],
  );

  /** 단일 슬롯 썸네일 src(F2): pending blob 우선, 없으면 저장값 키를 buildImageUrl 로 조립. */
  const getSinglePreviewUrl = useCallback(
    (slot: SingleImageSlot) => getPreviewUrl(slot, singleSlotSavedValue(invitation, slot)),
    [getPreviewUrl, invitation],
  );

  // ── 갤러리 지연 배선(F1·F2·F4) — AdminPage handleGalleryAddFiles/Remove 와 동형 ──
  // 추가: 업로드 없이 각 File 을 pending(slotKey=UUID)에 보관 + album 에 url='' placeholder 추가.
  const handleGalleryAddFiles = useCallback(
    (files: File[]) => {
      const placeholders: AlbumPhoto[] = files.map((file) => {
        const id = createPhotoId();
        setPending(id, file); // blob previewUrl 생성 + File 보관(업로드 X).
        return { id, url: '' }; // sentinel: Save commit 에서 키로 치환.
      });
      setInvitation((prev) => ({ ...prev, album: [...(prev.album ?? []), ...placeholders] }));
    },
    [setPending],
  );

  // 삭제(①, 삭제=revoke 단일 책임): pending 이면 clearPending(revoke+제거), 기존이면 album 필터.
  const handleGalleryRemove = useCallback(
    (id: string) => {
      if (hasPending(id)) {
        clearPending(id); // (revoke 지점 a)
      }
      setInvitation((prev) => ({
        ...prev,
        album: (prev.album ?? []).filter((item) => item.id !== id),
      }));
    },
    [hasPending, clearPending],
  );

  /** 갤러리 썸네일 src(F2): pending blob 우선, 없으면 저장 키. GalleryManager.getThumbnailUrl 에 주입. */
  const getGalleryThumbnailUrl = useCallback(
    (item: AlbumPhoto) => getPreviewUrl(item.id, item.url),
    [getPreviewUrl],
  );

  // 직전 commit 에 포함된 slot 목록. 저장 성공 후 정확히 이 slot 들의 blob 만 revoke 하기 위함(F7-b).
  const committedSlotsRef = useRef<string[]>([]);

  // ── 저장 commit(F3·F4·F6·완료정의7) — 단일+갤러리 pending 일괄 업로드 후 키 치환 invitation 반환 ──
  // PublishStep 이 호출한다. 원자성(F6): 한 장이라도 실패하면 throw → 호출부가 저장 미수행 + pending 유지.
  const commitPendingUploads = useCallback((): Promise<WeddingInvitation> => {
    // 이번 commit 대상 slot(단일 5슬롯 중 pending + 갤러리 album 항목 중 pending) 기록.
    const singleSlots = (['main', 'share', 'representative', 'aboutGroom', 'aboutBride'] as const)
      .filter((s) => hasPending(s));
    const gallerySlots = (invitation.album ?? [])
      .map((item) => item.id)
      .filter((id) => hasPending(id));
    committedSlotsRef.current = [...singleSlots, ...gallerySlots];
    return commitPending(invitation, applyFormUploadedKey, applyFormUploadPrefix);
  }, [commitPending, invitation, hasPending]);

  // 저장 성공 후 호출(F7-b): 직전 commit 에 포함된 slot 들의 previewUrl 만 revoke+clear 한다.
  const clearCommittedPending = useCallback(() => {
    clearAfterCommit(committedSlotsRef.current);
    committedSlotsRef.current = [];
  }, [clearAfterCommit]);

  // ── 표시 전용 파생본 displayInvitation(F2 미리보기) ───────────────────────────
  // invitation state 엔 키만(불변식 1). pending blob 은 viewer 가 읽는 필드에만 덮어 미리보기에 반영한다.
  // pending 0개면 invitation 동일 참조 반환(InvitationProvider useMemo([data]) 재렌더 최소화, [E6]).
  const displayInvitation = useMemo<WeddingInvitation>(() => {
    if (pendingCount === 0) return invitation; // 동일 참조 → 불필요한 재렌더 방지.

    let next = invitation;
    // 단일 viewer-read 슬롯(main/aboutGroom/aboutBride)에 pending blob 덮기.
    // share/representative 는 viewer 가 읽지 않으므로 덮지 않는다(썸네일은 getSinglePreviewUrl 로 별도 표시).
    for (const slot of ['main', 'aboutGroom', 'aboutBride'] as const) {
      if (hasPending(slot)) {
        next = applySingleImage(next, slot, getPreviewUrl(slot, undefined));
      }
    }
    // 갤러리: pending 항목(album 에 있고 pending 인 id)의 url 만 blob 으로 덮기.
    const album = next.album ?? [];
    const hasGalleryPending = album.some((item) => hasPending(item.id));
    if (hasGalleryPending) {
      next = {
        ...next,
        album: album.map((item) =>
          hasPending(item.id) ? { ...item, url: getPreviewUrl(item.id, item.url) } : item,
        ),
      };
    }
    return next;
  }, [invitation, pendingCount, hasPending, getPreviewUrl]);

  return {
    invitation,
    displayInvitation,
    // 기본/이름/예식/테마
    setInvitationInfo,
    setGroomName,
    setBrideName,
    setWeddingHall,
    setTheme,
    setThemeColor,
    // 주문자
    setOrder,
    setOrderPhone,
    // 신랑·신부 연락처
    setCouplePerson,
    setCouplePhone,
    // 혼주
    setParentsEnabled,
    setParentPerson,
    setParentPhone,
    // 계좌
    addAccount,
    removeAccount,
    updateAccount,
    // 축의금
    setGiftMoney,
    // 교통
    setEtcEnabled,
    addEtcLine,
    updateEtcLine,
    removeEtcLine,
    // RSVP
    setRsvp,
    setRsvpInclude,
    setRsvpPerSide,
    setRsvpPerSideInclude,
    // 소개
    setAboutUs,
    // 이미지 (F10) — 즉시 url 치환 setter(불러오기 라운드트립/검증용 유지)
    setSingleImage,
    setAlbum,
    // 이미지 지연 업로드 (F1·F2·F5·F8) — ImageStep 이 주입받음
    setSingleImagePending,
    getSinglePreviewUrl,
    onGalleryAddFiles: handleGalleryAddFiles,
    onGalleryRemoveItem: handleGalleryRemove,
    getGalleryThumbnailUrl,
    // 저장 commit (F3·F4·F6·완료정의7) — PublishStep 이 주입받음
    commitPendingUploads,
    clearCommittedPending,
    hasPending,
    pendingCount,
    // BGM (F11)
    setBgm,
    selectTrack,
    updateTrack,
    // 커스터마이즈 잔여 / 미니룸 (F12)
    setCustomization,
    setMiniRoom,
    // 불러오기 (F14)
    loadInvitation,
  };
}

export type { WeddingInvitation, ThemeKind, ThemeColorOptions, AmPm, Parents, EtcInfo };
