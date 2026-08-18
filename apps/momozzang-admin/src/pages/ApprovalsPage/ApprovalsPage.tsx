import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import type {
  InvitationStatus,
  InvitationSummary,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Panel } from '../../shared/ui/Panel';
import { AdminTopBar } from '../../widgets/AdminTopBar/AdminTopBar';
import { useAdminSession } from '../../features/auth/useAdminSession';
import { useInvitationListQuery } from '../../features/invitation/api/useInvitationListQuery';
import { useInvitationStatusMutation } from '../../features/invitation/api/useInvitationStatusMutation';
import styles from './ApprovalsPage.module.css';

type StatusFilter = InvitationStatus | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '승인 대기' },
  { value: 'approved', label: '승인 완료' },
  { value: 'rejected', label: '반려' },
];

const STATUS_LABEL: Record<InvitationStatus, string> = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
};

/**
 * 날짜는 사람이 읽는 형식으로 보여주되, 판정용 원문은 `data-created-at` / `data-approved-at`
 * 속성에 ISO 문자열 그대로 남긴다. 화면 표시만으로는 로케일·타임존에 판정이 흔들린다.
 */
function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString('ko-KR');
}

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useAdminSession();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const listQuery = useInvitationListQuery(filter === 'all' ? undefined : filter, {
    enabled: sessionQuery.data?.isAdmin === true,
  });
  const statusMutation = useInvitationStatusMutation();

  const rows: InvitationSummary[] = listQuery.data ?? [];

  const isRowBusy = (slug: string) =>
    statusMutation.isPending && statusMutation.variables?.slug === slug;

  /** 이미 선택된 필터를 다시 누르면 목록을 재조회한다(저장소가 바뀐 뒤의 수동 갱신 경로). */
  const handleFilter = (value: StatusFilter) => {
    if (value === filter) {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      return;
    }
    setFilter(value);
  };

  return (
    <div className={styles.page}>
      {/* 화면 사이 이동·로그아웃은 상단바 한 곳으로 모은다 — 두 보호 화면이 같은 탈출구를 갖는다.
          `RequireAdmin` 의 children 안쪽이므로 세션 판정 전에는 마운트되지 않는다. */}
      <AdminTopBar />

      <header className={styles.header}>
        <h1 className={styles.heading}>신청 관리</h1>
      </header>

      <Panel className={styles.wide}>
        <div className={styles.filters}>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={styles.filterButton}
              data-filter={item.value}
              aria-pressed={filter === item.value ? 'true' : 'false'}
              onClick={() => handleFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {listQuery.isPending ? <p className={styles.notice}>목록을 불러오는 중입니다.</p> : null}
        {listQuery.isError ? (
          <p className={styles.notice} role="alert">
            목록을 불러오지 못했습니다.
          </p>
        ) : null}
        {!listQuery.isPending && !listQuery.isError && rows.length === 0 ? (
          <p className={styles.notice}>신청 내역이 없습니다.</p>
        ) : null}

        {rows.length > 0 ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">슬러그</th>
                  <th scope="col">연락처</th>
                  <th scope="col">상태</th>
                  <th scope="col">신청일</th>
                  <th scope="col">처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.slug}
                    data-slug={row.slug}
                    data-status={row.status}
                    data-created-at={row.createdAt}
                    data-approved-at={row.approvedAt ?? ''}
                  >
                    <td>
                      {/* `편집` 은 `처리` 셀이 아니라 슬러그 셀에 둔다 — 승인/반려 버튼 영역과
                          hunk 가 겹치지 않고, 슬러그를 눈으로 읽어 다시 입력할 필요가 사라진다. */}
                      <div className={styles.slugCell}>
                        <span className={styles.slugText}>{row.slug}</span>
                        <Link
                          className={styles.editLink}
                          to={`/admin/edit?slug=${encodeURIComponent(row.slug)}`}
                          data-testid="approvals-edit-link"
                        >
                          편집
                        </Link>
                      </div>
                    </td>
                    <td>{row.applicantContact ? row.applicantContact : '-'}</td>
                    <td>
                      <span className={styles.badge} data-badge={row.status}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          size="sm"
                          disabled={isRowBusy(row.slug)}
                          onClick={() =>
                            statusMutation.mutate({ slug: row.slug, status: 'approved' })
                          }
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isRowBusy(row.slug)}
                          onClick={() =>
                            statusMutation.mutate({ slug: row.slug, status: 'rejected' })
                          }
                        >
                          반려
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

export default ApprovalsPage;
