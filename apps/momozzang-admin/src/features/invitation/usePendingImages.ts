import { useCallback, useEffect, useRef, useState } from 'react';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { buildImageUrl } from '@momozzang/ui/src/shared/lib/imageUrl';
import { resizeImage } from '../../shared/lib/resizeImage';
import { uploadToR2 } from '../../shared/lib/uploadToR2';

/**
 * 리사이즈 + 업로드(한 장). `useImageUploadMutation`과 동일한 조합(resize → uploadToR2)을 재사용한다.
 *
 * 주의(base 정합): 본 스프린트 base 인 main(18959f0)에는 `imageUpload.ts`/`resizeAndUploadImage`/
 * `isLocalDataSource` 가 존재하지 않는다(그 모듈들은 후속 apply-form 브랜치 소산). 따라서 계약 C3 의
 * "resizeAndUploadImage 재사용" 의도를, main 에 실제로 존재하는 동일 책임의 두 함수(`resizeImage` +
 * `uploadToR2`)를 같은 순서로 묶어 충족한다. 업로드/리사이즈 로직 자체는 재구현하지 않는다.
 */
async function resizeAndUpload(file: File, prefix: 'admin' | 'gallery'): Promise<string> {
  let fileToUpload = file;
  try {
    fileToUpload = await resizeImage(file);
  } catch (e) {
    console.error('Resize failed, uploading original', e);
  }
  const { key } = await uploadToR2(fileToUpload, prefix);
  return key;
}

/**
 * 지연 업로드(deferred upload)용 pending 이미지 상태 훅.
 *
 * 설계 의도 (SPRINT_CONTRACT_1 §3):
 * - 파일 선택(onChange) 시점에는 R2/스토리지 업로드를 하지 않는다. File 을 slotKey 별로 보관하고
 *   `URL.createObjectURL`로 만든 blob previewUrl 만 들고 있는다.
 * - 실제 업로드는 Save 시점에 `commitPendingUploads`가 일괄 수행한다(원자성: 전부 성공해야 반영).
 * - `invitation` 데이터에는 blob 을 절대 넣지 않는다(불변식: DB 에 blob 없음). blob 은 이 pending
 *   레이어에만 존재하며, 렌더 시 `getPreviewUrl`로 저장값(키) 위에 덮어 보여주기만 한다.
 *
 * 재사용 (S2 갤러리 / S3 신청 폼):
 * - slotKey 는 임의 문자열을 허용한다. 어드민 단일 4필드는 `main`/`share`/`groom`/`bride` 를 쓰지만,
 *   갤러리/신청 폼이 자기 스코프의 키 체계로 그대로 끌어다 쓸 수 있다.
 * - `commitPendingUploads(invitation, applyKey)` 의 `applyKey` 콜백으로 "어떤 slotKey 의 업로드 결과
 *   키를 invitation 의 어떤 필드에 꽂을지"를 호출부가 결정한다 → 슬롯↔필드 매핑을 훅 밖에 둔다.
 */
export interface PendingImage {
  /** 사용자가 고른 원본 File. Save 시점에 리사이즈+업로드된다. */
  file: File;
  /** `URL.createObjectURL(file)` 로 만든 미리보기 blob URL. */
  previewUrl: string;
}

/**
 * `commitPendingUploads`가 각 slot 의 업로드 결과 키를 invitation 에 반영하는 방법.
 * 호출부가 slotKey → 필드 매핑을 정의한다. 원본 invitation 을 변형하지 말고 새 객체를 반환할 것.
 */
export type ApplyUploadedKey = (
  invitation: WeddingInvitation,
  slotKey: string,
  uploadedKey: string,
) => WeddingInvitation;

/** R2 객체 키 prefix. 단일 4슬롯은 `admin`, 갤러리 항목은 `gallery`. */
export type UploadPrefix = 'admin' | 'gallery';

/**
 * commit 시 각 slotKey 가 어떤 prefix 로 업로드될지 결정한다.
 * - 단일 값(`'admin'`/`'gallery'`): 모든 slot 에 동일 prefix(S1 호환).
 * - 콜백: slotKey 별로 prefix 분기(S2: 단일 4슬롯=admin, 갤러리 UUID=gallery).
 *   이 방식이면 단일+갤러리를 **한 번의 commit 호출**로 묶어 원자성을 유지할 수 있다(②-i).
 */
export type UploadPrefixResolver = UploadPrefix | ((slotKey: string) => UploadPrefix);

export interface UsePendingImagesResult {
  /** slotKey 에 File 을 보관한다. 같은 slot 에 이미 pending 이 있으면 이전 previewUrl 을 revoke 후 교체한다. (revoke 지점 a) */
  setPending: (slotKey: string, file: File) => void;
  /** slotKey 의 pending 을 제거한다. previewUrl 을 revoke 한다. */
  clearPending: (slotKey: string) => void;
  /** 미리보기 src 단일 규칙: pending blob 이 있으면 blob, 없으면 저장값을 buildImageUrl 로 조립. */
  getPreviewUrl: (slotKey: string, savedValue: string | null | undefined) => string;
  /** 해당 slot 에 pending 이 있는지. */
  hasPending: (slotKey: string) => boolean;
  /** 현재 pending 슬롯 수(업로드 라벨/판정용). */
  pendingCount: number;
  /**
   * 모든 pending 을 리사이즈+업로드(`resizeImage` + `uploadToR2` 재사용)한 뒤,
   * 받은 키로 치환된 새 invitation 을 반환한다.
   *
   * 원자성(F6): 모든 업로드가 성공해야만 치환 결과를 반환한다. 하나라도 실패하면 throw 하며,
   * 이 경우 호출부는 saveInvitation 을 호출하지 않고 pending 을 유지한다(재시도 가능).
   * 성공 후 호출부가 saveInvitation 까지 마치면 `clearAfterCommit`를 호출해 blob 을 revoke+clear 한다. (revoke 지점 b)
   */
  commitPendingUploads: (
    invitation: WeddingInvitation,
    applyKey: ApplyUploadedKey,
    prefix?: UploadPrefixResolver,
  ) => Promise<WeddingInvitation>;
  /** Save 성공(저장 완료) 후, 커밋에 포함됐던 slot 들의 previewUrl 을 revoke+clear 한다. (revoke 지점 b) */
  clearAfterCommit: (slotKeys: string[]) => void;
}

export function usePendingImages(): UsePendingImagesResult {
  const [pending, setPending] = useState<Record<string, PendingImage>>({});

  // 언마운트 cleanup(revoke 지점 c) + 비동기 commit 에서 "최신 pending"을 stale 클로저 없이
  // 참조하기 위한 ref. 렌더 중 ref 를 읽지/쓰지 않도록(react-hooks 규칙) 동기화는 effect 에서만 한다.
  // 렌더 시점 읽기(getPreviewUrl/hasPending/pendingCount)는 ref 가 아니라 pending state 를 직접 쓴다.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const setPendingSlot = useCallback((slotKey: string, file: File) => {
    const previewUrl = window.URL.createObjectURL(file);
    setPending((prev) => {
      // (revoke 지점 a) 같은 slot 재선택 교체 시 이전 previewUrl 해제 → 마지막 1장만 남는다.
      const existing = prev[slotKey];
      if (existing) {
        window.URL.revokeObjectURL(existing.previewUrl);
      }
      return { ...prev, [slotKey]: { file, previewUrl } };
    });
  }, []);

  const clearPending = useCallback((slotKey: string) => {
    setPending((prev) => {
      const existing = prev[slotKey];
      if (!existing) return prev;
      window.URL.revokeObjectURL(existing.previewUrl);
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }, []);

  const getPreviewUrl = useCallback(
    (slotKey: string, savedValue: string | null | undefined) => {
      const p = pending[slotKey];
      if (p) return p.previewUrl;
      return buildImageUrl(savedValue);
    },
    [pending],
  );

  const hasPending = useCallback((slotKey: string) => Boolean(pending[slotKey]), [pending]);

  const commitPendingUploads = useCallback(
    async (
      invitation: WeddingInvitation,
      applyKey: ApplyUploadedKey,
      prefix: UploadPrefixResolver = 'admin',
    ): Promise<WeddingInvitation> => {
      // 호출 시점의 최신 pending 스냅샷(렌더 시 동기화된 state 클로저).
      const snapshot = pending;
      const slots = Object.keys(snapshot);
      if (slots.length === 0) return invitation;

      // ②-i: slotKey 기반 prefix 분기. 단일/갤러리를 한 commit 으로 묶어도
      // 각 slot 이 자기 prefix(admin/gallery)로 업로드된다 → 단일 호출 원자성 유지.
      const resolvePrefix = (slotKey: string): UploadPrefix =>
        typeof prefix === 'function' ? prefix(slotKey) : prefix;

      // 원자성(F6): 모든 업로드를 먼저 끝낸다. 하나라도 실패하면 Promise.all 이 reject 되고
      // 아래 invitation 치환에 도달하지 않으므로, state(invitation)에 부분 결과가 반영되지 않는다.
      //
      // 부분 성공 객체 처리(C3): 전체 중단 정책상, 일부 slot 이 R2 업로드에 성공한 뒤 다른 slot 이
      // 실패하면 그 성공분은 스토리지에 고아 객체로 남을 수 있다. 본 스프린트(단일 4슬롯·원자성 우선)
      // 에서는 이를 허용 범위로 둔다. 재시도(다음 Save) 시 동일 File 을 다시 업로드하므로 새 키가
      // 생기며(키에 타임스탬프/난수 포함), 이전 고아 객체는 별도 정리 대상이다(추후 스프린트 범위).
      const uploaded = await Promise.all(
        slots.map(async (slotKey) => {
          const key = await resizeAndUpload(snapshot[slotKey].file, resolvePrefix(slotKey));
          return { slotKey, key };
        }),
      );

      // 모든 업로드 성공 → 그제서야 invitation 치환(반환만, state 반영은 호출부 책임).
      let result = invitation;
      for (const { slotKey, key } of uploaded) {
        result = applyKey(result, slotKey, key);
      }
      return result;
    },
    [pending],
  );

  const clearAfterCommit = useCallback((slotKeys: string[]) => {
    setPending((prev) => {
      const next = { ...prev };
      for (const slotKey of slotKeys) {
        const existing = next[slotKey];
        if (existing) {
          window.URL.revokeObjectURL(existing.previewUrl); // (revoke 지점 b)
          delete next[slotKey];
        }
      }
      return next;
    });
  }, []);

  // (revoke 지점 c) 언마운트 시 살아있는 모든 previewUrl 해제 → blob 메모리 누수 방지.
  useEffect(() => {
    return () => {
      for (const p of Object.values(pendingRef.current)) {
        window.URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

  return {
    setPending: setPendingSlot,
    clearPending,
    getPreviewUrl,
    hasPending,
    pendingCount: Object.keys(pending).length,
    commitPendingUploads,
    clearAfterCommit,
  };
}
