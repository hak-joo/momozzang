import type { WeddingInvitation } from '../model';
import { exampleWeddingInvitation } from '../data';
import type { InvitationRepository } from './types';

/**
 * 로컬(비-Supabase) 환경용 청첩장 저장소.
 *
 * 이전에는 `getInvitation`이 slug와 무관하게 항상 시드를 반환하고 `updateInvitation`이
 * no-op이라 저장→재불러오기 라운드트립이 불가능했다(스프린트 3 [G2]).
 * 이제 `localStorage`에 slug별로 영속해 실제 Supabase에 쓰지 않고도 라운드트립이 성립한다.
 * 저장된 값이 없는 slug는 시드(`exampleWeddingInvitation`)로 폴백한다.
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

    // 저장된 값이 없으면 시드 사본을 반환(공유 상수 변형 방지).
    return structuredClone(exampleWeddingInvitation);
  }

  async updateInvitation(id: string, data: WeddingInvitation): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!hasStorage()) {
      throw new Error('localStorage를 사용할 수 없어 저장에 실패했습니다.');
    }
    window.localStorage.setItem(storageKey(id), JSON.stringify(data));
  }
}
