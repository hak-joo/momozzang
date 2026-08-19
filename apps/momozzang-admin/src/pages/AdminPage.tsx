import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type WeddingInvitation,
  type AlbumPhoto,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import { GalleryManager } from '../widgets/GalleryManager/GalleryManager';
import { AdminTopBar } from '../widgets/AdminTopBar/AdminTopBar';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import styles from './AdminPage.module.css';
import { Panel } from '../shared/ui/Panel';
import { ImageThumb } from '../shared/ui/ImageThumb';
import { FileDropField } from '../shared/ui/FileDropField';
import { useInvitationQuery } from '../features/invitation/api/useInvitationQuery';
import { useInvitationMutation } from '../features/invitation/api/useInvitationMutation';
import { usePendingImages, type ApplyUploadedKey } from '../features/invitation/usePendingImages';
import { createPhotoId, normalizeAlbumIds } from '../features/invitation/galleryHelpers';
import { useAdminToast } from '../shared/ui/Toast';

/** 어드민 단일 4필드 slotKey. usePendingImages 는 임의 문자열을 받지만 여기선 이 4개만 쓴다. */
type SingleSlot = 'main' | 'share' | 'groom' | 'bride';

const SINGLE_SLOTS: SingleSlot[] = ['main', 'share', 'groom', 'bride'];

const SINGLE_SLOT_SET = new Set<string>(SINGLE_SLOTS);

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

/** 쿼리(`?slug=`)가 없을 때의 기본 슬러그. 종전 하드코딩 값을 그대로 유지한다(회귀 0). */
const DEFAULT_SLUG = 'demo-captain-luna';

export default function AdminPage() {
  /**
   * 승인 목록의 `편집` 링크가 넘겨준 `?slug=` 를 마운트 시 1회 읽어 초기값으로 쓴다.
   * 쿼리가 없으면 종전 기본값 그대로다 — 직접 들어온 관리자의 동작은 바뀌지 않는다.
   * 이후의 슬러그 변경은 사용자가 툴바에서 하는 것이므로 쿼리를 계속 따라가지 않는다.
   */
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug')?.trim() || DEFAULT_SLUG;

  const [inputSlug, setInputSlug] = useState(initialSlug);
  const [slug, setSlug] = useState(initialSlug);
  const toast = useAdminToast();
  /**
   * 사용자가 `불러오기` 를 누른 요청. 최초 자동 조회에는 피드백을 내지 않기 위해 필요하다.
   * 같은 슬러그를 다시 눌러도(=캐시 적중) 피드백이 나가야 하므로 nonce 를 함께 담는다.
   */
  const [loadRequest, setLoadRequest] = useState<{ slug: string; nonce: number } | null>(null);

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

  /**
   * 불러오기 결과 알림(SPEC F10 · DoD 24).
   *
   * 종전에는 **성공도 실패도 아무 피드백이 없었다.** 특히 존재하지 않는 슬러그는
   * `SupabaseInvitationRepository.getInvitation` 이 에러가 아니라 `null` 을 돌려주므로
   * `isError` 분기에도 걸리지 않아 화면이 전혀 변하지 않았다 — 이전 청첩장이 그대로 남아
   * 사용자는 무엇이 일어났는지 알 수 없었다(계약 4 §0.9-V4 실측).
   */
  useEffect(() => {
    if (!loadRequest) return;
    // 새 슬러그로 전환되기 전이면 아직 판정하지 않는다.
    if (loadRequest.slug !== slug) return;
    if (isLoadingQuery) return;

    if (isError) {
      toast.error({
        title: `'${slug}' 청첩장을 불러오지 못했어요.`,
        description: `${error.message} — 잠시 후 다시 시도해주세요.`,
      });
    } else if (fetchedInvitation) {
      toast.success({ title: `'${slug}' 청첩장을 불러왔어요.` });
    } else {
      // 결과 없음(null). 에러가 아니므로 위 분기에 걸리지 않는다.
      toast.error({
        title: `'${slug}' 청첩장을 찾지 못했어요.`,
        description:
          '주소(슬러그)를 확인한 뒤 다시 시도해주세요. 화면에는 직전에 불러온 내용이 그대로 남아 있어요.',
      });
    }
    setLoadRequest(null);
  }, [loadRequest, slug, isLoadingQuery, isError, error, fetchedInvitation, toast]);

  const handleLoad = () => {
    const next = inputSlug.trim();
    if (!next) {
      toast.error({ title: '청첩장 주소(슬러그)를 입력한 뒤 다시 눌러주세요.' });
      return;
    }
    setSlug(next);
    setLoadRequest({ slug: next, nonce: Date.now() });
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
      // F6: 업로드 실패 → 저장 안 함, pending 유지.
      toast.error({
        title: '이미지 업로드에 실패했어요.',
        description: '선택한 이미지는 그대로 남아 있어요. 잠시 후 다시 저장해주세요.',
      });
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
      toast.success({ title: '저장했어요.', description: `'${slug}' 청첩장에 반영됐어요.` });
    } catch (e) {
      console.error(e);
      toast.error({
        title: '저장에 실패했어요.',
        description: '잠시 후 저장을 다시 눌러주세요.',
      });
      // 저장 실패: 업로드는 이미 끝났으므로 키 치환 결과를 유지하고 blob 도 정리(재저장만 누르면 됨).
      setInvitation(toSave);
      clearAfterCommit(committedSlots);
    }
  };

  const isBusy = isUploading || isSaving;
  const saveLabel = isUploading ? '업로드 중...' : isSaving ? '저장 중...' : '저장';
  const statusMessage = isLoadingQuery
    ? '데이터를 불러오는 중...'
    : isUploading
      ? '이미지를 업로드하는 중...'
      : isSaving
        ? '저장하는 중...'
        : null;

  return (
    <ControlVariantProvider value="admin">
    <div className={styles.container}>
      {/* 편집 화면에도 같은 탈출구를 준다 — 종전에는 브라우저 뒤로가기 외에 /admin 으로 돌아갈 길이 없었다.
          `RequireAdmin` 의 children 안쪽이므로 세션 판정 전에는 마운트되지 않는다. */}
      <AdminTopBar />

      <header className={styles.header}>
        <h1 className={styles.title}>청첩장 관리자</h1>
        {/* A7: 슬러그 입력 + 불러오기 + 저장을 한 행(툴바)에 묶는다. */}
        <Panel
          toolbar={
            <>
              {/* DoD 22 — 화면의 모든 폼 컨트롤이 label[for] 로 연결된다.
                  placeholder 는 입력이 시작되면 사라지므로 접근 가능한 이름의 근거가 아니다. */}
              <label className={styles.toolbarLabel} htmlFor="admin-slug">
                청첩장 주소
              </label>
              <Input
                id="admin-slug"
                value={inputSlug}
                onChange={(e) => setInputSlug(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                placeholder="청첩장 주소(슬러그)"
                className={styles.slugInput}
              />
              <Button onClick={handleLoad} variant="secondary">
                불러오기
              </Button>
              <Button onClick={handleSave} disabled={isBusy || !invitation} variant="primary">
                {saveLabel}
              </Button>
            </>
          }
        >
          {statusMessage && <p className={styles.status}>{statusMessage}</p>}
          {/* 딥링크로 들어왔을 때 "어느 청첩장이 열렸는지" 를 확인할 수단이 필요하다 —
              종전에는 슬러그 입력칸 말고는 조회 대상을 알려주는 표시가 없었다. */}
          {invitation && (
            <p className={styles.loaded} data-testid="admin-loaded-invitation">
              현재 편집 중: <b>{invitation.couple.groom.name}</b> ·{' '}
              <b>{invitation.couple.bride.name}</b> <span className={styles.loadedSlug}>({slug})</span>
            </p>
          )}
        </Panel>
      </header>

      {invitation ? (
        <InvitationProvider data={invitation}>
          <div className={styles.content}>
            <Panel title="대표 이미지">
              <div className={styles.grid}>
                <FileDropField
                  slot="main"
                  id="admin-file-main"
                  label="메인 이미지"
                  disabled={isBusy}
                  onFiles={(files) => handleSingleSelect(files[0], 'main')}
                >
                  <ImageThumb
                    src={getPreviewUrl('main', savedValueOf(invitation, 'main'))}
                    alt="메인 이미지"
                    ratio="portrait"
                    className={styles.previewImage}
                  />
                </FileDropField>

                <FileDropField
                  slot="share"
                  id="admin-file-share"
                  label="공유 썸네일(카카오)"
                  disabled={isBusy}
                  onFiles={(files) => handleSingleSelect(files[0], 'share')}
                >
                  <ImageThumb
                    src={getPreviewUrl('share', savedValueOf(invitation, 'share'))}
                    alt="공유 썸네일"
                    ratio="square"
                    className={styles.previewImage}
                  />
                </FileDropField>
              </div>
            </Panel>

            <Panel title="신랑·신부 이미지">
              <div className={styles.grid}>
                <FileDropField
                  slot="groom"
                  id="admin-file-groom"
                  label="신랑 사진"
                  disabled={isBusy}
                  onFiles={(files) => handleSingleSelect(files[0], 'groom')}
                >
                  <ImageThumb
                    src={getPreviewUrl('groom', savedValueOf(invitation, 'groom'))}
                    alt="신랑 사진"
                    ratio="square"
                    className={styles.previewImage}
                  />
                </FileDropField>

                <FileDropField
                  slot="bride"
                  id="admin-file-bride"
                  label="신부 사진"
                  disabled={isBusy}
                  onFiles={(files) => handleSingleSelect(files[0], 'bride')}
                >
                  <ImageThumb
                    src={getPreviewUrl('bride', savedValueOf(invitation, 'bride'))}
                    alt="신부 사진"
                    ratio="square"
                    className={styles.previewImage}
                  />
                </FileDropField>
              </div>
            </Panel>

            {/* 갤러리의 표면은 호스트가 준다 — GalleryManager 자신은 표면을 갖지 않는다(중첩 카드 해소). */}
            <Panel>
              <GalleryManager
                album={invitation.album || []}
                onChange={(newAlbum) => setInvitation({ ...invitation, album: newAlbum })}
                onAddFiles={handleGalleryAddFiles}
                onRemoveItem={handleGalleryRemove}
                // F2: 미리보기 src 단일 규칙. pending 이면 blob, 기존이면 키를 buildImageUrl 로 조립.
                getThumbnailUrl={(item) => getPreviewUrl(item.id, item.url)}
                disabled={isBusy}
              />
            </Panel>
          </div>
        </InvitationProvider>
      ) : (
        <div className={styles.loading}>
          {isLoadingQuery
            ? '불러오는 중...'
            : isError
              ? `오류: ${error.message}`
              : '슬러그를 입력한 뒤 불러오기를 눌러주세요.'}
        </div>
      )}
    </div>
    </ControlVariantProvider>
  );
}
