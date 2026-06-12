import { useCallback, useState } from 'react';
import { exampleWeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/data';
import {
  type WeddingInvitation,
  type ThemeKind,
  type ThemeColorOptions,
  type AmPm,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';

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

  const setInvitationInfo = useCallback(
    (patch: Partial<WeddingInvitation['invitationInfo']>) => {
      setInvitation((prev) => ({
        ...prev,
        invitationInfo: { ...prev.invitationInfo, ...patch },
      }));
    },
    [],
  );

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

  const setWeddingHall = useCallback(
    (patch: Partial<WeddingInvitation['weddingHallInfo']>) => {
      setInvitation((prev) => ({
        ...prev,
        weddingHallInfo: { ...prev.weddingHallInfo, ...patch },
      }));
    },
    [],
  );

  const setTheme = useCallback((theme: ThemeKind) => {
    setInvitation((prev) => ({ ...prev, theme }));
  }, []);

  const setThemeColor = useCallback((themeColor: ThemeColorOptions) => {
    setInvitation((prev) => ({
      ...prev,
      customization: {
        // customization이 선택 필드이므로 안전하게 보강
        enabled: prev.customization?.enabled ?? true,
        mainImageUrl: prev.customization?.mainImageUrl ?? '',
        showDDay: prev.customization?.showDDay ?? true,
        ...prev.customization,
        themeColor,
      },
    }));
  }, []);

  return {
    invitation,
    setInvitationInfo,
    setGroomName,
    setBrideName,
    setWeddingHall,
    setTheme,
    setThemeColor,
  };
}

export type { WeddingInvitation, ThemeKind, ThemeColorOptions, AmPm };
