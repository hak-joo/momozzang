import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import { AdminTopBar } from '../widgets/AdminTopBar/AdminTopBar';
import { Panel } from '../shared/ui/Panel';
import { Stepper, type StepItem } from '../widgets/Stepper/Stepper';
import { PhonePreview } from '../widgets/PhonePreview/PhonePreview';
import { ApplyForm } from '../widgets/ApplyForm/ApplyForm';
import { ImageStep } from '../widgets/ImageStep/ImageStep';
import { ErrorBoundary } from '../widgets/ErrorBoundary/ErrorBoundary';
import { useApplyForm } from '../features/apply/useApplyForm';
import {
  validateInvitationBody,
  type ValidationIssue,
} from '../features/apply/validateInvitation';
import { useInvitationRecordQuery } from '../features/invitation/api/useInvitationRecordQuery';
import { useInvitationMutation } from '../features/invitation/api/useInvitationMutation';
import { useUnsavedChangesBlocker } from '../shared/hooks/useUnsavedChangesBlocker';
import { useAdminToast } from '../shared/ui/Toast';
import styles from './AdminPage.module.css';
import '@momozzang/ui/src/index.css';

const DEFAULT_SLUG = 'demo-captain-luna';

const STEPS: StepItem[] = [
  { id: 1, label: '정보입력' },
  { id: 2, label: '영상·이미지 등록' },
  { id: 3, label: '수정 저장' },
];

type MobileTab = 'form' | 'preview';

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug')?.trim() || DEFAULT_SLUG;

  const [inputSlug, setInputSlug] = useState(initialSlug);
  const [slug, setSlug] = useState(initialSlug);
  const [step, setStep] = useState(1);
  const [mobileTab, setMobileTab] = useState<MobileTab>('form');
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [applicantContact, setApplicantContact] = useState<string>('');

  const toast = useAdminToast();
  const [loadRequest, setLoadRequest] = useState<{ slug: string; nonce: number } | null>(null);

  const {
    data: fetchedRecord,
    isPending: isLoadingQuery,
    isError,
    error,
  } = useInvitationRecordQuery(slug, { enabled: Boolean(slug) });

  const saveMutation = useInvitationMutation();
  const isSaving = saveMutation.isPending;

  const form = useApplyForm();
  const {
    invitation,
    displayInvitation,
    isDirty,
    resetDirty,
    loadInvitation,
    setInvitationInfo,
    setGroomName,
    setBrideName,
    setWeddingHall,
    setTheme,
    setThemeColor,
    setOrder,
    setOrderPhone,
    setCouplePerson,
    setCouplePhone,
    setParentsEnabled,
    setParentPerson,
    setParentPhone,
    addAccount,
    removeAccount,
    updateAccount,
    setGiftMoney,
    setEtcEnabled,
    addEtcLine,
    updateEtcLine,
    removeEtcLine,
    setRsvp,
    setRsvpInclude,
    setRsvpPerSide,
    setRsvpPerSideInclude,
    setAboutUs,
    setAlbum,
    setBgm,
    selectTrack,
    updateTrack,
    setCustomization,
    setMiniRoom,
    setSingleImagePending,
    getSinglePreviewUrl,
    onGalleryAddFiles,
    onGalleryRemoveItem,
    getGalleryThumbnailUrl,
    commitPendingUploads,
    clearCommittedPending,
  } = form;

  useUnsavedChangesBlocker(isDirty);

  // 레코드 로드 시 폼 동기화
  useEffect(() => {
    if (fetchedRecord?.data) {
      loadInvitation(fetchedRecord.data);
      setApplicantContact(fetchedRecord.applicantContact ?? '');
      resetDirty(fetchedRecord.data);
    }
  }, [fetchedRecord, loadInvitation, resetDirty]);

  // 불러오기 결과 토스트 안내
  useEffect(() => {
    if (!loadRequest) return;
    if (loadRequest.slug !== slug) return;
    if (isLoadingQuery) return;

    if (isError) {
      toast.error({
        title: `'${slug}' 청첩장을 불러오지 못했어요.`,
        description: `${error.message} — 잠시 후 다시 시도해주세요.`,
      });
    } else if (fetchedRecord) {
      toast.success({ title: `'${slug}' 청첩장을 불러왔어요.` });
    } else {
      toast.error({
        title: `'${slug}' 청첩장을 찾지 못했어요.`,
        description:
          '주소(슬러그)를 확인한 뒤 다시 시도해주세요. 화면에는 직전에 불러온 내용이 그대로 남아 있어요.',
      });
    }
    setLoadRequest(null);
  }, [loadRequest, slug, isLoadingQuery, isError, error, fetchedRecord, toast]);

  const handleLoad = () => {
    const next = inputSlug.trim();
    if (!next) {
      toast.error({ title: '청첩장 주소(슬러그)를 입력한 뒤 다시 눌러주세요.' });
      return;
    }
    setSlug(next);
    setLoadRequest({ slug: next, nonce: Date.now() });
  };

  const handleSave = async () => {
    if (!invitation || isUploading || isSaving) return;

    const validationIssues = validateInvitationBody(invitation);
    setIssues(validationIssues);

    if (validationIssues.length > 0) {
      toast.error({
        title: '입력 내용을 확인해 주세요.',
        description: `${validationIssues.length}개의 확인 항목이 있습니다.`,
      });
      return;
    }

    let toSave = invitation;
    try {
      setIsUploading(true);
      toSave = await commitPendingUploads();
    } catch (err) {
      console.error(err);
      toast.error({
        title: '이미지 업로드에 실패했어요.',
        description: '선택한 이미지는 그대로 남아 있어요. 잠시 후 다시 저장해 주세요.',
      });
      return;
    } finally {
      setIsUploading(false);
    }

    try {
      await saveMutation.mutateAsync({ slug, data: toSave });
      loadInvitation(toSave);
      resetDirty(toSave);
      clearCommittedPending();
      toast.success({
        title: '저장했어요.',
        description: `'${slug}' 청첩장에 변경사항이 저장됐어요.`,
      });
    } catch (err) {
      console.error(err);
      toast.error({
        title: '저장에 실패했어요.',
        description: '잠시 후 다시 저장을 눌러주세요.',
      });
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
        <AdminTopBar />

        <header className={styles.header}>
          <h1 className={styles.title}>청첩장 관리자 — 전체 데이터 편집</h1>
          <Panel
            toolbar={
              <>
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
            {invitation && (
              <p className={styles.loaded} data-testid="admin-loaded-invitation">
                현재 편집 중: <b>{invitation.couple.groom.name}</b> ·{' '}
                <b>{invitation.couple.bride.name}</b>{' '}
                <span className={styles.loadedSlug}>({slug})</span>
              </p>
            )}
          </Panel>
        </header>

        {/* 좁은 폭(≤768px) 탭 토글 */}
        <div className={styles.mobileTabs} role="tablist" aria-label="편집 파네 토글">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'form'}
            className={clsx(styles.mobileTab, mobileTab === 'form' && styles.mobileTabActive)}
            onClick={() => setMobileTab('form')}
          >
            입력 폼
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={clsx(styles.mobileTab, mobileTab === 'preview' && styles.mobileTabActive)}
            onClick={() => setMobileTab('preview')}
          >
            미리보기
          </button>
        </div>

        {invitation ? (
          <InvitationProvider data={displayInvitation}>
            <div className={styles.body}>
              <div
                className={clsx(
                  styles.previewPane,
                  mobileTab === 'preview' ? styles.mobileShow : styles.mobileHide,
                )}
              >
                <PhonePreview invitation={displayInvitation} />
              </div>

              <div
                className={clsx(
                  styles.formPane,
                  mobileTab === 'form' ? styles.mobileShow : styles.mobileHide,
                )}
              >
                <Stepper steps={STEPS} current={step} onStepClick={setStep} />

                {step === 1 && (
                  <ErrorBoundary>
                    <ApplyForm
                      invitation={invitation}
                      onInvitationInfoChange={setInvitationInfo}
                      onGroomNameChange={setGroomName}
                      onBrideNameChange={setBrideName}
                      onWeddingHallChange={setWeddingHall}
                      onThemeChange={setTheme}
                      onThemeColorChange={setThemeColor}
                      onOrderChange={setOrder}
                      onOrderPhoneChange={setOrderPhone}
                      onCouplePersonChange={setCouplePerson}
                      onCouplePhoneChange={setCouplePhone}
                      onParentsEnabledChange={setParentsEnabled}
                      onParentPersonChange={setParentPerson}
                      onParentPhoneChange={setParentPhone}
                      onAddAccount={addAccount}
                      onRemoveAccount={removeAccount}
                      onUpdateAccount={updateAccount}
                      onGiftMoneyChange={setGiftMoney}
                      onEtcEnabledChange={setEtcEnabled}
                      onAddEtcLine={addEtcLine}
                      onUpdateEtcLine={updateEtcLine}
                      onRemoveEtcLine={removeEtcLine}
                      onRsvpChange={setRsvp}
                      onRsvpIncludeChange={setRsvpInclude}
                      onRsvpPerSideChange={setRsvpPerSide}
                      onRsvpPerSideIncludeChange={setRsvpPerSideInclude}
                      onAboutUsChange={setAboutUs}
                      readOnlyApplicantContact={applicantContact}
                    />
                  </ErrorBoundary>
                )}

                {step === 2 && (
                  <ErrorBoundary>
                    <ImageStep
                      invitation={invitation}
                      onSingleImagePending={setSingleImagePending}
                      getSinglePreviewUrl={getSinglePreviewUrl}
                      onGalleryAddFiles={onGalleryAddFiles}
                      onGalleryRemoveItem={onGalleryRemoveItem}
                      getGalleryThumbnailUrl={getGalleryThumbnailUrl}
                      onAlbumChange={setAlbum}
                      onBgmChange={setBgm}
                      onSelectTrack={selectTrack}
                      onUpdateTrack={updateTrack}
                      onCustomizationChange={setCustomization}
                      onMiniRoomChange={setMiniRoom}
                    />
                  </ErrorBoundary>
                )}

                {step === 3 && (
                  <Panel title="수정 저장">
                    <p className={styles.status}>
                      수정한 내용을 청첩장에 저장합니다. 이미지가 포함되어 있다면 업로드 후 함께 저장됩니다.
                    </p>

                    {issues.length > 0 && (
                      <div className={clsx(styles.banner, styles.bannerError)}>
                        <strong>저장하려면 아래 항목을 확인해 주세요:</strong>
                        <ul className={styles.issueList}>
                          {issues.map((issue) => (
                            <li key={issue.field}>
                              {issue.label}: {issue.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <Button onClick={handleSave} disabled={isBusy} variant="primary">
                        {saveLabel}
                      </Button>
                    </div>
                  </Panel>
                )}
              </div>
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
