import { type AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';

/**
 * 갤러리 pending 항목 식별자/정규화 공용 헬퍼.
 *
 * AdminPage(경로 B)·useApplyForm(경로 C)이 동일한 dnd-kit 식별자 규칙과 album id 보정 로직을
 * 공유하도록 추출했다. 동작은 S2 AdminPage 원본과 동형이다(회귀 금지).
 */

/**
 * 안정적 임시 id 생성. crypto.randomUUID 미지원 환경 폴백을 둔다.
 * 갤러리 pending 항목의 dnd-kit 식별자 겸 usePendingImages slotKey 로 쓰인다.
 */
export function createPhotoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * album 항목 id 보정. **로드 시 1회만** 호출한다.
 * - id 가 비었으면: 키(url)가 있으면 그 키를, 없으면 randomUUID 를 부여.
 * - id 가 이미 본 값과 중복이면: 새 randomUUID 로 교체(dnd-kit 식별자 고유성 보장).
 * 그 외(고유·비어있지 않음)는 그대로 둔다 → 렌더마다 재부여하지 않으므로 dnd-kit 안정.
 */
export function normalizeAlbumIds(album: AlbumPhoto[]): AlbumPhoto[] {
  const seen = new Set<string>();
  return album.map((item) => {
    let id = item.id;
    if (!id || seen.has(id)) {
      id = item.url || createPhotoId();
      // 키조차 비었거나 그 키마저 이미 본 값이면 randomUUID 로 강제 고유화.
      while (!id || seen.has(id)) {
        id = createPhotoId();
      }
    }
    seen.add(id);
    return id === item.id ? item : { ...item, id };
  });
}
