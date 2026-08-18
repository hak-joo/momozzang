import styles from './OnboardingPage.module.css';

/**
 * 서비스 소개 랜딩(`/`).
 *
 * 청첩장 본문 데이터를 한 글자도 쓰지 않는다 — `InvitationExperience`·`InvitationProvider`·
 * `useInvitation` 중 아무것도 import 하지 않으므로 이 화면에는 본문 노드가 존재할 수 없다.
 *
 * CTA 는 `<a href>` 다. 공유 `Button` 은 `<button>` 을 렌더해 목적지를 가질 수 없다.
 * 스타일은 기존 버튼 토큰만 조합한다(신규 색상 리터럴 0건).
 */
const STEPS = [
  { name: '신청', description: '신청 폼에 청첩장 내용을 채워 접수합니다.' },
  { name: '승인', description: '운영자가 내용을 확인하고 공개 여부를 결정합니다.' },
  { name: '공개', description: '승인되면 신청할 때 정한 주소로 청첩장이 열립니다.' },
];

export function OnboardingPage() {
  // 값이 없거나 공백뿐이면 앵커 자체를 만들지 않는다.
  // 빈 href 는 "현재 페이지 재요청"으로 동작해 눌러도 아무 일도 없는 죽은 버튼이 되고,
  // `/apply` 같은 그럴듯한 기본값은 이 앱에서 `/:invitationId` 에 잡혀 오히려 오해를 만든다.
  const applyUrl = (import.meta.env.VITE_APPLY_URL ?? '').trim();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>모모짱 청첩장</h1>

      <p className={styles.intro} data-testid="onboarding-intro">
        픽셀 감성 모바일 청첩장을 신청하고, 승인 후 나만의 주소로 공개하세요.
      </p>

      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step.name} className={styles.step}>
            <span className={styles.stepName}>{step.name}</span>
            {step.description}
          </li>
        ))}
      </ol>

      {applyUrl ? (
        <a className={styles.cta} data-testid="onboarding-apply-cta" href={applyUrl}>
          청첩장 신청하기
        </a>
      ) : (
        <p className={styles.unavailable} data-testid="onboarding-apply-unavailable">
          신청 주소가 아직 설정되지 않았습니다. 운영자에게 문의해 주세요.
        </p>
      )}

      <p className={styles.hint} data-testid="onboarding-edit-hint">
        이미 신청하셨나요? 신청할 때 정한 슬러그와 편집 비밀번호로 수정할 수 있습니다.
      </p>
    </div>
  );
}

export default OnboardingPage;
