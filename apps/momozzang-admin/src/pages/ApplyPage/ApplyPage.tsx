import { useState } from 'react';
import { clsx } from 'clsx';
import { Stepper, type StepItem } from '../../widgets/Stepper/Stepper';
import { PhonePreview } from '../../widgets/PhonePreview/PhonePreview';
import { ApplyForm } from '../../widgets/ApplyForm/ApplyForm';
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
    setInvitationInfo,
    setGroomName,
    setBrideName,
    setWeddingHall,
    setTheme,
    setThemeColor,
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
          <PhonePreview invitation={invitation} />
        </aside>

        <main
          className={clsx(
            styles.formPane,
            mobileTab === 'form' ? styles.mobileShow : styles.mobileHide,
          )}
        >
          {step === 1 && (
            <ApplyForm
              invitation={invitation}
              onInvitationInfoChange={setInvitationInfo}
              onGroomNameChange={setGroomName}
              onBrideNameChange={setBrideName}
              onWeddingHallChange={setWeddingHall}
              onThemeChange={setTheme}
              onThemeColorChange={setThemeColor}
            />
          )}
          {step === 2 && (
            <div className={styles.placeholder}>
              <h3>영상 · 이미지 등록</h3>
              <p>이 단계는 다음 스프린트에서 제공됩니다. (대표/공유/갤러리 이미지 업로드)</p>
            </div>
          )}
          {step === 3 && (
            <div className={styles.placeholder}>
              <h3>제작 완료</h3>
              <p>이 단계는 다음 스프린트에서 제공됩니다. (저장 및 청첩장 링크 안내)</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
