import type { WeddingInvitation } from '../model';
import type { InvitationRepository } from './types';

/**
 * 로컬(비-Supabase) 환경용 청첩장 저장소.
 *
 * 이전에는 `getInvitation`이 slug와 무관하게 항상 시드를 반환하고 `updateInvitation`이
 * no-op이라 저장→재불러오기 라운드트립이 불가능했다(스프린트 3 [G2]).
 * 이제 `localStorage`에 slug별로 영속해 실제 Supabase에 쓰지 않고도 라운드트립이 성립한다.
 * 저장된 값이 없는 slug는 `null`을 반환한다(N1) — 미존재 슬러그 불러오기가
 * "성공"으로 오인되지 않게 하고, Supabase 구현체(실 조회 시 미존재면 null)와 동작을 일치시킨다.
 * 신규 진입 시 시드 시작은 폼(`useApplyForm`)이 직접 `exampleWeddingInvitation`을 초기값으로
 * 쓰므로 이 저장소 변경의 영향을 받지 않는다.
 */
const STORAGE_PREFIX = 'momozzang:invitation:';

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export class LocalInvitationRepository implements InvitationRepository {
  async getInvitation(id: string): Promise<WeddingInvitation | null> {
    // 기존 동작과 유사하게 약간의 비동기 지연을 둔다(로딩 표시 검증 호환).
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (hasStorage()) {
      const raw = window.localStorage.getItem(storageKey(id));
      if (raw) {
        try {
          return JSON.parse(raw) as WeddingInvitation;
        } catch {
          // 파싱 실패 시 시드로 폴백
        }
      }
    }

    // 저장된 값이 없으면 null을 반환(미존재 슬러그 — N1). PublishStep이 "불러오지 못했습니다" 안내.
    return null;
  }

  async updateInvitation(id: string, data: WeddingInvitation): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!hasStorage()) {
      throw new Error('localStorage를 사용할 수 없어 저장에 실패했습니다.');
    }
    window.localStorage.setItem(storageKey(id), JSON.stringify(data));
  }
}
