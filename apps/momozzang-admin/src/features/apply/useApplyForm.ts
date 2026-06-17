import { useCallback, useState } from 'react';
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
  const setSingleImage = useCallback((slot: SingleImageSlot, url: string) => {
    setInvitation((prev) => {
      switch (slot) {
        case 'main':
          return { ...prev, customization: { ...defaultCustomization(prev.customization), mainImageUrl: url } };
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
            nextImages = existing.map((img, i) =>
              i === repIndex ? { ...img, url } : img,
            );
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
    });
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

  return {
    invitation,
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
    // 이미지 (F10)
    setSingleImage,
    setAlbum,
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
