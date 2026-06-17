import { useState, useEffect } from 'react';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
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

/**
 * slotKey 업로드 결과 키를 invitation 의 해당 필드에 반영한다(불변 갱신).
 * 기존 handleSingleUpload 의 필드 매핑을 그대로 옮긴 것. blob 이 아니라 업로드된 "키"만 들어간다.
 */
const applySingleUploadedKey: ApplyUploadedKey = (invitation, slotKey, key) => {
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
  const { setPending, getPreviewUrl, hasPending, commitPendingUploads, clearAfterCommit } =
    usePendingImages();
  const [isUploading, setIsUploading] = useState(false);

  const [invitation, setInvitation] = useState<WeddingInvitation | null>(null);

  useEffect(() => {
    if (fetchedInvitation) {
      setInvitation(fetchedInvitation);
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

  // Save(F3): pending 4슬롯을 일괄 업로드 → 키 치환된 invitation 으로 저장.
  // 업로드 실패 시 saveInvitation 미호출 + pending 유지(F6). 성공 시에만 blob revoke+clear(F7-b).
  const handleSave = async () => {
    if (!invitation || isUploading || isSaving) return;

    // 이번 커밋 대상 slot 목록(저장 성공 후 정확히 이 slot 들의 blob 만 revoke).
    const committedSlots = SINGLE_SLOTS.filter((s) => hasPending(s));

    let toSave: WeddingInvitation;
    try {
      setIsUploading(true);
      // F3·F4: pending 있는 slot 만 업로드하고, 없는 slot 은 기존 키가 그대로 보존된다.
      toSave = await commitPendingUploads(invitation, applySingleUploadedKey, 'admin');
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
