import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { clsx } from 'clsx';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import type { WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Panel, PanelScreen } from '../../shared/ui/Panel';
import { Stepper, type StepItem } from '../../widgets/Stepper/Stepper';
import { PhonePreview } from '../../widgets/PhonePreview/PhonePreview';
import { ApplyForm } from '../../widgets/ApplyForm/ApplyForm';
import { ImageStep } from '../../widgets/ImageStep/ImageStep';
import { ErrorBoundary } from '../../widgets/ErrorBoundary/ErrorBoundary';
import { useApplyForm } from '../../features/apply/useApplyForm';
import {
  validateInvitationBody,
  type ValidationIssue,
} from '../../features/apply/validateInvitation';
import { useEditGateMutation, useEditSaveMutation } from '../../features/apply/useEditGate';
import styles from './EditPage.module.css';
import '@momozzang/ui/src/index.css';

const STEPS: StepItem[] = [
  { id: 1, label: '정보입력' },
  { id: 2, label: '영상·이미지 등록' },
  { id: 3, label: '수정 저장' },
];

/**
 * 신청자용 청첩장 수정 화면(`/edit`) — **공개 라우트**다.
 *
 * 신청자는 관리자 계정이 없으므로 `RequireAdmin` 뒤에 두지 않는다. 접근 통제는 슬러그+편집
 * 비밀번호 게이트가 담당하고, 저장도 비밀번호를 동반하는 `updateInvitationWithPassword` 로만 나간다.
 *
 * 잠금 해제 전에는 편집 폼을 **마운트조차 하지 않는다**. `useApplyForm` 의 초기값이 데모 청첩장이라
 * 미리 마운트하면 남의 화면에 데모 데이터가 뜨고, 실패 화면에 편집 입력이 남는다.
 */
export function EditPage() {
  const [slugInput, setSlugInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  /** 게이트를 통과한 슬러그/비밀번호. 저장 때 함께 보내며 화면에는 다시 표시하지 않는다. */
  const [gate, setGate] = useState<{ slug: string; editPassword: string } | null>(null);
  const [step, setStep] = useState(1);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const gateMutation = useEditGateMutation();
  const saveMutation = useEditSaveMutation();
  const form = useApplyForm();
  const { loadInvitation, commitPendingUploads, clearCommittedPending } = form;

  const handleGateSubmit = (event: FormEvent) => {
    event.preventDefault();
    gateMutation.mutate(
      { slug: slugInput.trim(), editPassword: passwordInput },
      {
        onSuccess: (data) => {
          // 폼 교체를 먼저 부른다 — 같은 핸들러 안이라 React 배치로 데모 데이터가 한 프레임도 보이지 않는다.
          loadInvitation(data);
          setGate({ slug: slugInput.trim(), editPassword: passwordInput });
          setPasswordInput('');
        },
      },
    );
  };

  const handleSave = useCallback(async () => {
    if (!gate || isUploading || saveMutation.isPending) return;
    setSaveMessage(null);

    // 1) 본문만 검증한다. `/edit` 에는 신청 메타가 없다.
    const found = validateInvitationBody(form.invitation);
    setIssues(found);
    if (found.length > 0) {
      return;
    }

    // 2) pending 이미지를 먼저 commit 한다. 실패하면 저장을 호출하지 않고 pending 을 유지한다.
    let committed: WeddingInvitation;
    try {
      setIsUploading(true);
      committed = await commitPendingUploads();
    } catch (err) {
      setSaveMessage({
        kind: 'error',
        text: `수정 저장에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
      return;
    } finally {
      setIsUploading(false);
    }

    // 3) 저장 대상 행은 게이트로 연 슬러그다. 폼에서 슬러그를 바꿔도 대상이 옮겨가지 않도록 강제한다.
    const toSave: WeddingInvitation = {
      ...committed,
      invitationInfo: { ...committed.invitationInfo, url: gate.slug },
    };

    saveMutation.mutate(
      { slug: gate.slug, editPassword: gate.editPassword, data: toSave },
      {
        onSuccess: () => {
          loadInvitation(toSave);
          clearCommittedPending();
          setSaveMessage({ kind: 'success', text: '수정 내용이 저장되었습니다.' });
        },
        onError: (err) => {
          setSaveMessage({
            kind: 'error',
            text: `수정 저장에 실패했습니다: ${
              err instanceof Error ? err.message : '알 수 없는 오류'
            }`,
          });
        },
      },
    );
  }, [
    gate,
    form.invitation,
    commitPendingUploads,
    clearCommittedPending,
    loadInvitation,
    saveMutation,
    isUploading,
  ]);

  if (!gate) {
    return (
      <PanelScreen>
        <Panel title="청첩장 수정">
          <p className={styles.notice}>
            신청할 때 정한 주소(슬러그)와 편집 비밀번호를 입력해 주세요.
          </p>
          <form className={styles.form} onSubmit={handleGateSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-slug">
                주소(슬러그)
              </label>
              <Input
                id="edit-slug"
                aria-required="true"
                value={slugInput}
                onChange={(event) => setSlugInput(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-password">
                편집 비밀번호
              </label>
              <Input
                id="edit-password"
                type="password"
                aria-required="true"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
              />
            </div>

            {gateMutation.isError ? (
              <p className={styles.error} role="alert" data-testid="edit-gate-error">
                {gateMutation.error.message}
              </p>
            ) : null}

            <Button
              type="submit"
              fullWidth
              disabled={gateMutation.isPending}
              data-testid="edit-gate-submit"
            >
              {gateMutation.isPending ? '확인 중...' : '편집 시작하기'}
            </Button>
          </form>
        </Panel>
      </PanelScreen>
    );
  }

  const isBusy = isUploading || saveMutation.isPending;
  const saveLabel = isUploading
    ? '업로드 중...'
    : saveMutation.isPending
      ? '저장 중...'
      : '수정 저장';

  return (
    <div className={styles.page} data-testid="edit-form">
      <header className={styles.topbar}>
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        {/* Stepper 가 좁은 폭에서 숫자만 노출하므로 스텝 이름을 그대로 가진 버튼을 따로 둔다. */}
        <div className={styles.stepNav}>
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.navButton}
              aria-current={step === item.id ? 'true' : undefined}
              data-testid={`edit-step-${item.id}`}
              onClick={() => setStep(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.previewPane}>
          <ErrorBoundary label="미리보기">
            <PhonePreview invitation={form.displayInvitation} />
          </ErrorBoundary>
        </aside>

        <main className={styles.formPane}>
          <p className={styles.slugHint} data-testid="edit-slug-fixed-hint">
            주소(슬러그)는 변경할 수 없습니다. 현재 주소:{' '}
            <span className={styles.slugValue}>{gate.slug}</span>
          </p>

          <ErrorBoundary label="입력 폼">
            <InvitationProvider data={form.displayInvitation} previewMode>
              {step === 1 && (
                <ApplyForm
                  invitation={form.invitation}
                  onInvitationInfoChange={form.setInvitationInfo}
                  onGroomNameChange={form.setGroomName}
                  onBrideNameChange={form.setBrideName}
                  onWeddingHallChange={form.setWeddingHall}
                  onThemeChange={form.setTheme}
                  onThemeColorChange={form.setThemeColor}
                  onOrderChange={form.setOrder}
                  onOrderPhoneChange={form.setOrderPhone}
                  onCouplePersonChange={form.setCouplePerson}
                  onCouplePhoneChange={form.setCouplePhone}
                  onParentsEnabledChange={form.setParentsEnabled}
                  onParentPersonChange={form.setParentPerson}
                  onParentPhoneChange={form.setParentPhone}
                  onAddAccount={form.addAccount}
                  onRemoveAccount={form.removeAccount}
                  onUpdateAccount={form.updateAccount}
                  onGiftMoneyChange={form.setGiftMoney}
                  onEtcEnabledChange={form.setEtcEnabled}
                  onAddEtcLine={form.addEtcLine}
                  onUpdateEtcLine={form.updateEtcLine}
                  onRemoveEtcLine={form.removeEtcLine}
                  onRsvpChange={form.setRsvp}
                  onRsvpIncludeChange={form.setRsvpInclude}
                  onRsvpPerSideChange={form.setRsvpPerSide}
                  onRsvpPerSideIncludeChange={form.setRsvpPerSideInclude}
                  onAboutUsChange={form.setAboutUs}
                />
              )}
              {step === 2 && (
                <ImageStep
                  invitation={form.invitation}
                  onSingleImagePending={form.setSingleImagePending}
                  getSinglePreviewUrl={form.getSinglePreviewUrl}
                  onGalleryAddFiles={form.onGalleryAddFiles}
                  onGalleryRemoveItem={form.onGalleryRemoveItem}
                  getGalleryThumbnailUrl={form.getGalleryThumbnailUrl}
                  onAlbumChange={form.setAlbum}
                  onBgmChange={form.setBgm}
                  onSelectTrack={form.selectTrack}
                  onUpdateTrack={form.updateTrack}
                  onCustomizationChange={form.setCustomization}
                  onMiniRoomChange={form.setMiniRoom}
                />
              )}
              {step === 3 && (
                <section className={styles.saveStep}>
                  <h3 className={styles.saveTitle}>수정 저장</h3>
                  <p className={styles.saveDescription}>
                    수정한 내용을 저장합니다. 공개 상태와 신청 정보는 그대로 유지됩니다.
                  </p>

                  {issues.length > 0 && (
                    <div
                      className={clsx(styles.banner, styles.bannerError)}
                      data-testid="edit-issues"
                      role="alert"
                    >
                      입력을 확인해 주세요.
                      <ul className={styles.issueList}>
                        {issues.map((issue) => (
                          <li key={issue.field}>
                            {issue.label}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {saveMessage && (
                    <p
                      className={clsx(
                        styles.banner,
                        saveMessage.kind === 'success' ? styles.bannerSuccess : styles.bannerError,
                      )}
                      data-testid="edit-save-message"
                      role="status"
                    >
                      {saveMessage.text}
                    </p>
                  )}

                  <Button type="button" onClick={handleSave} disabled={isBusy}>
                    {saveLabel}
                  </Button>
                </section>
              )}
            </InvitationProvider>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default EditPage;
