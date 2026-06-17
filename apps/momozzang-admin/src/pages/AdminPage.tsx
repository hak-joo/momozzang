import { useState, useEffect } from 'react';
import {
  type WeddingInvitation,
  type AlbumPhoto,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Box } from '@momozzang/ui/src/shared/ui/Box/Box';
import { GalleryManager } from '../widgets/GalleryManager/GalleryManager';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import styles from './AdminPage.module.css';
import { clsx } from 'clsx';
import { useInvitationQuery } from '../features/invitation/api/useInvitationQuery';
import { useInvitationMutation } from '../features/invitation/api/useInvitationMutation';
import { usePendingImages, type ApplyUploadedKey } from '../features/invitation/usePendingImages';

/** 어드민 단일 4필드 slotKey. usePendingImages 는 임의 문자열을 받지만 여기선 이 4개만 쓴다. */
type SingleSlot = 'main' | 'share' | 'groom' | 'bride';

const SINGLE_SLOTS: SingleSlot[] = ['main', 'share', 'groom', 'bride'];

const SINGLE_SLOT_SET = new Set<string>(SINGLE_SLOTS);

/**
 * 안정적 임시 id 생성(⑥). ToastProvider.createToastId 선례와 동형으로
 * crypto.randomUUID 미지원 환경 폴백을 둔다. 갤러리 pending 항목의 dnd-kit 식별자 겸 slotKey.
 */
function createPhotoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * album 항목 id 보정(④, §3-1 마이그레이션 안전장치). **로드 시 1회만** 호출한다.
 * - id 가 비었으면: 키(url)가 있으면 그 키를, 없으면 randomUUID 를 부여.
 * - id 가 이미 본 값과 중복이면: 새 randomUUID 로 교체(dnd-kit 식별자 고유성 보장).
 * 그 외(고유·비어있지 않음)는 그대로 둔다 → 렌더마다 재부여하지 않으므로 dnd-kit 안정.
 */
function normalizeAlbumIds(album: AlbumPhoto[]): AlbumPhoto[] {
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

/**
 * slotKey 업로드 결과 키를 invitation 에 반영한다(불변 갱신, ③).
 * 단일 4슬롯(main/share/groom/bride)이면 해당 필드에, 그 외(=갤러리 항목 id)면 album 에서
 * 같은 id 항목의 url 만 업로드 키로 치환한다(id 는 유지 → React 재마운트/순서 흔들림 방지, ③·④).
 * 단일+갤러리 slotKey 가 한 commit 에 섞여 와도 이 한 함수가 분기해 모두 처리한다(⑤).
 * blob 이 아니라 업로드된 "키"만 들어간다.
 */
const applyUploadedKey: ApplyUploadedKey = (invitation, slotKey, key) => {
  if (!SINGLE_SLOT_SET.has(slotKey)) {
    // 갤러리 항목: album 에서 slotKey(=항목 id) 를 찾아 url 만 치환, id 유지.
    const album = invitation.album ?? [];
    return {
      ...invitation,
      album: album.map((item) => (item.id === slotKey ? { ...item, url: key } : item)),
    };
  }

  const next = { ...invitation };
  if (slotKey === 'main') {
    next.customization = {
      ...(next.customization ?? {}),
      mainImageUrl: key,
    } as WeddingInvitation['customization'];
  } else if (slotKey === 'share') {
    next.invitationInfo = { ...next.invitationInfo, shareImageUrl: key };
  } else if (slotKey === 'bride') {
    next.aboutUs = {
      ...(next.aboutUs ?? {}),
      brideImageUrl: key,
    } as WeddingInvitation['aboutUs'];
  } else if (slotKey === 'groom') {
    next.aboutUs = {
      ...(next.aboutUs ?? {}),
      groomImageUrl: key,
    } as WeddingInvitation['aboutUs'];
  }
  return next;
};

/** ②-i: slotKey 별 prefix. 단일 4슬롯=admin, 그 외(갤러리 항목 id)=gallery. */
const resolveUploadPrefix = (slotKey: string): 'admin' | 'gallery' =>
  SINGLE_SLOT_SET.has(slotKey) ? 'admin' : 'gallery';

/** 각 slot 의 현재 저장값(키/URL)을 invitation 에서 꺼낸다. 미리보기 src 조립용. */
function savedValueOf(invitation: WeddingInvitation, slot: SingleSlot): string | undefined {
  switch (slot) {
    case 'main':
      return invitation.customization?.mainImageUrl;
    case 'share':
      return invitation.invitationInfo?.shareImageUrl;
    case 'groom':
      return invitation.aboutUs?.groomImageUrl;
    case 'bride':
      return invitation.aboutUs?.brideImageUrl;
  }
}

export default function AdminPage() {
  const [inputSlug, setInputSlug] = useState('demo-captain-luna');
  const [slug, setSlug] = useState('demo-captain-luna');

  const {
    data: fetchedInvitation,
    isPending: isLoadingQuery,
    isError,
    error,
  } = useInvitationQuery(slug);
  const { mutateAsync: saveInvitation, isPending: isSaving } = useInvitationMutation();

  // 지연 업로드 pending 레이어(F1·F2·F5·F7). 업로드는 Save 시점에만 일어난다.
  // 단일 4슬롯과 갤러리 항목(slotKey=UUID)을 동일 인스턴스 하나로 보관한다(§3-3).
  const {
    setPending,
    clearPending,
    getPreviewUrl,
    hasPending,
    commitPendingUploads,
    clearAfterCommit,
  } = usePendingImages();
  const [isUploading, setIsUploading] = useState(false);

  const [invitation, setInvitation] = useState<WeddingInvitation | null>(null);

  useEffect(() => {
    if (fetchedInvitation) {
      // ④: album id 보정은 로드(fetched→state) 시점 1회만. 이후 렌더에서 재부여하지 않는다.
      setInvitation({
        ...fetchedInvitation,
        album: normalizeAlbumIds(fetchedInvitation.album ?? []),
      });
    } else if (isError) {
      setInvitation(null);
    }
  }, [fetchedInvitation, isError]);

  const handleLoad = () => {
    setSlug(inputSlug);
  };

  // 파일 선택(F1): 업로드하지 않고 pending 에 보관 + blob previewUrl 생성만 한다.
  // (revoke 지점 a 는 setPending 내부에서 이전 previewUrl 을 해제한다.)
  const handleSingleSelect = (file: File, slot: SingleSlot) => {
    if (!invitation) return;
    setPending(slot, file);
  };

  // 갤러리 파일 추가(F1): 업로드 없이 각 File 을 pending(slotKey=UUID)에 보관하고,
  // album 에 url='' placeholder 항목을 순서대로 추가만 한다. blob 은 pending 레이어에만 존재한다.
  const handleGalleryAddFiles = (files: File[]) => {
    if (!invitation) return;
    const placeholders: AlbumPhoto[] = files.map((file) => {
      const id = createPhotoId();
      setPending(id, file); // blob previewUrl 생성 + File 보관(업로드 X).
      return { id, url: '' }; // sentinel: 아직 키 없음. Save commit 에서 키로 치환(③).
    });
    setInvitation({ ...invitation, album: [...(invitation.album ?? []), ...placeholders] });
  };

  // 갤러리 항목 삭제(①, 삭제=revoke 단일 책임). pending 이면 clearPending(=revoke+제거),
  // 기존 항목이면 album 필터만(R2 객체 정리는 S2 범위 외 — 기존 동작 유지).
  const handleGalleryRemove = (id: string) => {
    if (!invitation) return;
    if (hasPending(id)) {
      clearPending(id); // (revoke 지점 a) pending blob 해제 + pending 맵에서 제거.
    }
    setInvitation({
      ...invitation,
      album: (invitation.album ?? []).filter((item) => item.id !== id),
    });
  };

  // Save(F3): 단일 4슬롯 + 갤러리 pending 을 한 번에 일괄 업로드 → 키 치환된 invitation 으로 저장.
  // 업로드 실패 시 saveInvitation 미호출 + pending 전체 유지(F6·⑤). 성공 시에만 blob revoke+clear(F7-b).
  const handleSave = async () => {
    if (!invitation || isUploading || isSaving) return;

    // 이번 커밋 대상 slot 목록(저장 성공 후 정확히 이 slot 들의 blob 만 revoke).
    // 단일 4슬롯 + 갤러리 pending 항목 id(album 에 있고 pending 맵에도 있는 항목).
    const committedSingleSlots = SINGLE_SLOTS.filter((s) => hasPending(s));
    const committedGallerySlots = (invitation.album ?? [])
      .map((item) => item.id)
      .filter((id) => hasPending(id));
    const committedSlots = [...committedSingleSlots, ...committedGallerySlots];

    let toSave: WeddingInvitation;
    try {
      setIsUploading(true);
      // F3·F4: pending 있는 slot(단일+갤러리)만 업로드. 기존 키 항목/슬롯은 그대로 보존된다.
      // ②-i: slotKey 기반 prefix(단일=admin, 갤러리=gallery)로 단일 호출 원자성 유지(⑤).
      toSave = await commitPendingUploads(invitation, applyUploadedKey, resolveUploadPrefix);
    } catch (e) {
      console.error(e);
      alert('Upload failed. Please try again.'); // F6: 업로드 실패 → 저장 안 함, pending 유지.
      return;
    } finally {
      setIsUploading(false);
    }

    try {
      await saveInvitation({ slug, data: toSave });
      // 키 치환된 결과를 state 에 반영(데이터엔 blob 이 아니라 키만 — 불변식).
      setInvitation(toSave);
      // F7-b: 저장 성공 직후 커밋된 slot 들의 blob revoke + pending clear.
      clearAfterCommit(committedSlots);
      alert('Saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Error saving invitation');
      // 저장 실패: 업로드는 이미 끝났으므로 키 치환 결과를 유지하고 blob 도 정리(재저장만 누르면 됨).
      setInvitation(toSave);
      clearAfterCommit(committedSlots);
    }
  };

  const isBusy = isUploading || isSaving;
  const saveLabel = isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Changes';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Momozzang Admin</h1>
        <div className={styles.controls}>
          <Input
            value={inputSlug}
            onChange={(e) => setInputSlug(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            placeholder="Invitation Slug"
            className={styles.slugInput}
          />
          <Button onClick={handleLoad} variant="secondary">
            Load
          </Button>
        </div>
        {isLoadingQuery && <span style={{ marginLeft: 10 }}>Loading data...</span>}
        {isUploading && <span style={{ marginLeft: 10 }}>Uploading...</span>}
        {isSaving && <span style={{ marginLeft: 10 }}>Saving...</span>}
        <div style={{ marginTop: 10 }}>
          <Button onClick={handleSave} disabled={isBusy || !invitation} variant="primary">
            {saveLabel}
          </Button>
        </div>
      </header>

      {invitation ? (
        <InvitationProvider data={invitation}>
          <div className={styles.content}>
            <Box variant="primary">
              <h3 className={styles.sectionHeader}>Main Images</h3>
              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Main Image</label>
                  {getPreviewUrl('main', savedValueOf(invitation, 'main')) && (
                    <img
                      src={getPreviewUrl('main', savedValueOf(invitation, 'main'))}
                      alt="Main"
                      className={clsx(styles.previewImage, styles.previewMain)}
                      loading="lazy"
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleSelect(e.target.files[0], 'main')
                    }
                    disabled={isBusy}
                  />
                </div>

                <div>
                  <label className={styles.label}>Share Thumbnail (Kakao)</label>
                  {getPreviewUrl('share', savedValueOf(invitation, 'share')) && (
                    <img
                      src={getPreviewUrl('share', savedValueOf(invitation, 'share'))}
                      alt="Share"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                      loading="lazy"
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleSelect(e.target.files[0], 'share')
                    }
                    disabled={isBusy}
                  />
                </div>
              </div>
            </Box>

            <Box variant="primary">
              <h3 className={styles.sectionHeader}>Couple Images</h3>
              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Groom</label>
                  {getPreviewUrl('groom', savedValueOf(invitation, 'groom')) && (
                    <img
                      src={getPreviewUrl('groom', savedValueOf(invitation, 'groom'))}
                      alt="Groom"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                      loading="lazy"
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleSelect(e.target.files[0], 'groom')
                    }
                    disabled={isBusy}
                  />
                </div>

                <div>
                  <label className={styles.label}>Bride</label>
                  {getPreviewUrl('bride', savedValueOf(invitation, 'bride')) && (
                    <img
                      src={getPreviewUrl('bride', savedValueOf(invitation, 'bride'))}
                      alt="Bride"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                      loading="lazy"
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleSelect(e.target.files[0], 'bride')
                    }
                    disabled={isBusy}
                  />
                </div>
              </div>
            </Box>

            <GalleryManager
              album={invitation.album || []}
              onChange={(newAlbum) => setInvitation({ ...invitation, album: newAlbum })}
              onAddFiles={handleGalleryAddFiles}
              onRemoveItem={handleGalleryRemove}
              // F2: 미리보기 src 단일 규칙. pending 이면 blob, 기존이면 키를 buildImageUrl 로 조립.
              getThumbnailUrl={(item) => getPreviewUrl(item.id, item.url)}
              disabled={isBusy}
            />
          </div>
        </InvitationProvider>
      ) : (
        <div className={styles.loading}>
          {isLoadingQuery
            ? 'Loading...'
            : isError
              ? `Error: ${error.message}`
              : 'Please enter a slug to load invitation.'}
        </div>
      )}
    </div>
  );
}
