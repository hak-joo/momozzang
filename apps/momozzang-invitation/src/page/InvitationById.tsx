import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { InvitationExperience } from './InvitationExperience';
import styles from './InvitationById.module.css';

/** 안내 문구. JSX 안에 여러 줄로 적으면 공백이 접혀 문자열이 흔들린다. */
const PENDING_HELP_MESSAGE =
  '승인은 운영자 확인 후 진행되며, 결과는 신청 시 입력하신 연락처로 안내드립니다.';
const HOME_LINK_LABEL = '모모짱 홈으로';

/**
 * 슬러그로 청첩장을 여는 하객용 화면.
 *
 * 조회는 본문만 주는 `getInvitation` 이 아니라 `getInvitationRecord` 로 한다 —
 * 공개 여부(`status`)를 볼 수 없으면 게이트가 성립하지 않는다.
 *
 * 게이트는 **early return** 이다. `pending`/`rejected`/미존재 화면에서는
 * `InvitationExperience` 를 아예 렌더하지 않는다. 본문을 그린 뒤 안내 배너만 얹으면
 * 인트로 뒤에 신랑·신부 실명과 예식장 주소가 DOM 에 그대로 남아 비공개가 아니게 된다.
 *
 * 저장된 행이 없을 때(`null`)는 예외가 아니라 **정상 경로**다. 예외로 바꿔 `/` 로 튕기면
 * 사용자는 자기 청첩장이 왜 안 열리는지 알 수 없다.
 *
 * 다섯 안내 화면은 전부 **막다른 골목이 아니어야 한다.** 기존 문구와 `data-testid` 는 그대로 두고
 * (`docs/invitation-app.md` 의 status 게이트 표가 정본이다) 다음 행동만 덧붙인다.
 */
function InvitationByIdPage() {
  const { invitationId } = useParams();

  const recordQuery = useQuery({
    // 값의 모양이 `WeddingInvitation` 이 아니라 `InvitationRecord` 이므로
    // admin 의 ['invitation', slug] 캐시와 키를 분리한다.
    queryKey: ['invitation-record', invitationId],
    queryFn: () => getInvitationRepository().getInvitationRecord(invitationId ?? ''),
    enabled: Boolean(invitationId),
    retry: false,
  });

  /** 재조회는 `retry: false` 라 자동으로 일어나지 않는다 — 사용자가 직접 눌러야 한다. */
  const isRefetching = recordQuery.isFetching;
  const refetch = () => {
    void recordQuery.refetch();
  };

  if (!invitationId) {
    return <Navigate to="/" replace />;
  }

  if (recordQuery.isPending) {
    return (
      <div className={styles.screen} data-testid="invitation-loading">
        {/* 진행 표시는 장식이므로 접근성 트리에서 감춘다 — 읽어줄 내용은 아래 문구가 이미 갖고 있다.
            `prefers-reduced-motion: reduce` 에서는 CSS 가 애니메이션을 끄고 정적 막대로 대체한다. */}
        <div
          className={styles.progress}
          data-testid="invitation-loading-progress"
          aria-hidden="true"
        />
        <p className={styles.title}>불러오는 중입니다.</p>
      </div>
    );
  }

  if (recordQuery.isError) {
    return (
      <div className={styles.screen} data-testid="invitation-error">
        <p className={styles.title}>청첩장을 불러오지 못했습니다.</p>
        <p className={styles.description}>잠시 후 다시 시도해 주세요.</p>
        <button
          type="button"
          className={styles.action}
          onClick={refetch}
          disabled={isRefetching}
          data-testid="invitation-error-retry"
        >
          {isRefetching ? '다시 시도 중...' : '다시 시도'}
        </button>
      </div>
    );
  }

  const record = recordQuery.data;

  if (!record) {
    return (
      <div className={styles.screen} data-testid="invitation-notice-missing">
        <p className={styles.title}>존재하지 않는 청첩장입니다.</p>
        <p className={styles.description}>주소를 다시 확인해 주세요.</p>
        <Link className={styles.action} to="/" data-testid="invitation-missing-home">
          {HOME_LINK_LABEL}
        </Link>
      </div>
    );
  }

  if (record.status === 'pending') {
    return (
      <div className={styles.screen} data-testid="invitation-notice-pending">
        <p className={styles.title}>승인 대기 중인 청첩장입니다.</p>
        <p className={styles.description}>승인이 완료되면 청첩장이 공개됩니다.</p>
        <p className={styles.description} data-testid="invitation-pending-help">
          {PENDING_HELP_MESSAGE}
        </p>
        {/* 승인은 다른 화면(어드민)에서 일어난다. 새로고침 말고 이 자리에서 다시 확인할 수단을 준다. */}
        <button
          type="button"
          className={styles.action}
          onClick={refetch}
          disabled={isRefetching}
          data-testid="invitation-pending-refresh"
        >
          {isRefetching ? '확인 중...' : '상태 다시 확인'}
        </button>
      </div>
    );
  }

  if (record.status === 'rejected') {
    return (
      <div className={styles.screen} data-testid="invitation-notice-rejected">
        <p className={styles.title}>공개되지 않은 청첩장입니다.</p>
        <p className={styles.description}>자세한 내용은 신청 시 입력하신 연락처로 안내드립니다.</p>
        <Link className={styles.action} to="/" data-testid="invitation-rejected-home">
          {HOME_LINK_LABEL}
        </Link>
      </div>
    );
  }

  return <InvitationExperience metadata={record.data} />;
}

export default InvitationByIdPage;
