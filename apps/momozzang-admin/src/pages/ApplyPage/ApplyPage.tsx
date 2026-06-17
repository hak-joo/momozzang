import { useState } from 'react';
import { clsx } from 'clsx';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import { Stepper, type StepItem } from '../../widgets/Stepper/Stepper';
import { PhonePreview } from '../../widgets/PhonePreview/PhonePreview';
import { ApplyForm } from '../../widgets/ApplyForm/ApplyForm';
import { ImageStep } from '../../widgets/ImageStep/ImageStep';
import { PublishStep } from '../../widgets/PublishStep/PublishStep';
import { ErrorBoundary } from '../../widgets/ErrorBoundary/ErrorBoundary';
import { useApplyForm } from '../../features/apply/useApplyForm';
import styles from './ApplyPage.module.css';
import '@momozzang/ui/src/index.css';
import './fonts.css';

const STEPS: StepItem[] = [
  { id: 1, label: '정보입력' },
  { id: 2, label: '영상·이미지 등록' },
  { id: 3, label: '제작 완료' },
];

type MobileTab = 'form' | 'preview';

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [mobileTab, setMobileTab] = useState<MobileTab>('form');
  const {
    invitation,
    displayInvitation,
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
    setSingleImagePending,
    getSinglePreviewUrl,
    onGalleryAddFiles,
    onGalleryRemoveItem,
    getGalleryThumbnailUrl,
    commitPendingUploads,
    clearCommittedPending,
    setBgm,
    selectTrack,
    updateTrack,
    setCustomization,
    setMiniRoom,
    loadInvitation,
  } = useApplyForm();

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        <div className={styles.stepNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            이전
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={step === STEPS.length}
          >
            다음
          </button>
        </div>
      </header>

      {/* 좁은 폭 전용 탭 토글 (≤768px) */}
      <div className={styles.mobileTabs} role="tablist">
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

      <div className={styles.body}>
        <aside
          className={clsx(
            styles.previewPane,
            mobileTab === 'preview' ? styles.mobileShow : styles.mobileHide,
          )}
        >
          <ErrorBoundary label="미리보기">
            <PhonePreview invitation={displayInvitation} />
          </ErrorBoundary>
        </aside>

        <main
          className={clsx(
            styles.formPane,
            mobileTab === 'form' ? styles.mobileShow : styles.mobileHide,
          )}
        >
          {/*
            폼 패널을 InvitationProvider로 감싸 GalleryManager(Box) 등 provider 의존
            공유 컴포넌트가 폼 패널에서도 안전 동작하게 한다(C1 수정 A안). 좌측 PhonePreview의
            provider와는 별개 인스턴스이나 동일한 invitation 참조를 공유한다.
            previewMode를 부여해 폼 패널 provider가 document.title을 덮어쓰지 않게 한다.
            ErrorBoundary로 단일 위젯 예외가 앱 전체를 화이트스크린하지 않도록 격리한다.
          */}
          <ErrorBoundary label="입력 폼">
            <InvitationProvider data={displayInvitation} previewMode>
              {step === 1 && (
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
            />
          )}
          {step === 2 && (
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
          )}
              {step === 3 && (
                <PublishStep
                  invitation={invitation}
                  onLoad={loadInvitation}
                  commitPendingUploads={commitPendingUploads}
                  clearCommittedPending={clearCommittedPending}
                />
              )}
            </InvitationProvider>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
