import { useCallback, useRef, useState } from 'react';
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
import { getSlugError } from '../../features/apply/validateSlug';
import styles from './EditPage.module.css';
import '@momozzang/ui/src/index.css';

/** 게이트 화면의 안내 문구. JSX 안에 여러 줄로 적으면 공백이 접혀 문자열이 흔들린다. */
const GATE_RECOVERY_MESSAGE =
  '주소나 편집 비밀번호가 기억나지 않으면, 신청할 때 입력하신 연락처로 운영자에게 문의해 주세요.';
const GATE_REFRESH_NOTE = '보안을 위해 새로고침하면 주소와 편집 비밀번호를 다시 입력해야 해요.';

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
  /**
   * 편집 비밀번호 입력은 **비제어(uncontrolled)** 로 둔다.
   *
   * React 는 제어 입력의 `value` 를 DOM 의 `value` **속성**에도 반영하기 때문에, 제어로 두면
   * `document.body.innerHTML` 에 편집 비밀번호 평문이 그대로 직렬화된다(표시 토글을 켜지 않아도
   * 마찬가지다 — 실측 확인). 표시 토글을 붙이는 이 화면에서는 그 노출을 남길 이유가 없다.
   * 값은 제출 시점에 ref 로 한 번 읽고, 통과하면 입력칸을 즉시 비운다.
   */
  const passwordRef = useRef<HTMLInputElement>(null);
  /** 게이트를 통과한 슬러그/비밀번호. 저장 때 함께 보내며 화면에는 다시 표시하지 않는다. */
  const [gate, setGate] = useState<{ slug: string; editPassword: string } | null>(null);
  const [step, setStep] = useState(1);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  /** 게이트 폼 보조 상태. 선언은 이 블록 **끝에** 덧붙인다 — 같은 파일을 만지는 뒤 태스크와
      hunk 가 인접하되 겹치지 않게 하기 위한 규칙이다. */
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const gateMutation = useEditGateMutation();
  const saveMutation = useEditSaveMutation();
  const form = useApplyForm();
  const { loadInvitation, commitPendingUploads, clearCommittedPending } = form;

  const handleGateSubmit = (event: FormEvent) => {
    event.preventDefault();
    // fieldset disabled 와 별개로 한 번 더 막는다 — Enter 연타는 같은 프레임 안에서 여러 번
    // submit 을 발생시킬 수 있고, 그때는 아직 isPending 이 DOM 에 반영되기 전이다.
    if (gateMutation.isPending) return;

    const editPassword = passwordRef.current?.value ?? '';
    gateMutation.mutate(
      { slug: slugInput.trim(), editPassword },
      {
        onSuccess: (data) => {
          // 폼 교체를 먼저 부른다 — 같은 핸들러 안이라 React 배치로 데모 데이터가 한 프레임도 보이지 않는다.
          loadInvitation(data);
          setGate({ slug: slugInput.trim(), editPassword });
          if (passwordRef.current) passwordRef.current.value = '';
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
    // 실시간 피드백은 `/apply` 와 **같은 규칙**을 재사용한다(문자셋만 본다 — 길이는 저장 시점 검증).
    // 새 규칙을 발명하면 두 화면의 판정이 갈린다.
    const slugError = getSlugError(slugInput);

    return (
      <PanelScreen>
        <Panel title="청첩장 수정">
          <p className={styles.notice}>
            신청할 때 정한 주소(슬러그)와 편집 비밀번호를 입력해 주세요.
          </p>
          <form className={styles.form} onSubmit={handleGateSubmit} data-testid="edit-gate-form">
            {/* 제출 중에는 fieldset 하나로 두 입력과 버튼을 한꺼번에 잠근다 —
                버튼만 disabled 로 두면 입력에서 Enter 를 눌러 중복 제출이 나간다. */}
            <fieldset className={styles.fieldset} disabled={gateMutation.isPending}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-slug">
                  주소(슬러그)
                </label>
                <Input
                  id="edit-slug"
                  aria-required="true"
                  aria-invalid={slugError ? 'true' : 'false'}
                  aria-describedby={slugError ? 'edit-slug-error' : undefined}
                  value={slugInput}
                  onChange={(event) => setSlugInput(event.target.value)}
                />
                {slugError ? (
                  <p
                    className={styles.error}
                    id="edit-slug-error"
                    role="alert"
                    data-testid="edit-slug-error"
                  >
                    {slugError}
                  </p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-password">
                  편집 비밀번호
                </label>
                <div className={styles.passwordRow}>
                  <Input
                    ref={passwordRef}
                    id="edit-password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    aria-required="true"
                    autoComplete="current-password"
                    className={styles.passwordInput}
                  />
                  {/* 접근 가능한 이름은 두 상태에서 고정하고, 눌림 상태는 aria-pressed 로 노출한다. */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={styles.passwordToggle}
                    aria-pressed={isPasswordVisible}
                    aria-label="편집 비밀번호 표시 전환"
                    aria-controls="edit-password"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    data-testid="edit-password-toggle"
                  >
                    {isPasswordVisible ? '숨김' : '표시'}
                  </Button>
                </div>
              </div>

              {/* 자격증명 오류 문구는 한 문장 그대로 둔다 — 슬러그 존재 여부가 새면 안 된다. */}
              {gateMutation.isError ? (
                <p className={styles.error} role="alert" data-testid="edit-gate-error">
                  {gateMutation.error.message}
                </p>
              ) : null}

              {/* 회복 안내는 오류 요소와 **별개 요소**다. 두 실패 케이스에서 완전히 동일하다. */}
              {gateMutation.isError ? (
                <p className={styles.recovery} data-testid="edit-gate-recovery">
                  {GATE_RECOVERY_MESSAGE}
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
            </fieldset>
          </form>

          {/* 새로고침하면 게이트로 되돌아가는 것은 의도된 설계다. 그 사실을 화면에서 고지한다. */}
          <p className={styles.refreshNote} data-testid="edit-gate-refresh-note">
            {GATE_REFRESH_NOTE}
          </p>
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
