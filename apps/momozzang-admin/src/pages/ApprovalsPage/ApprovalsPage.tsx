import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import type {
  InvitationStatus,
  InvitationSummary,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Panel } from '../../shared/ui/Panel';
import { useAdminSession, useSignOutMutation } from '../../features/auth/useAdminSession';
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
  const signOut = useSignOutMutation();
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
      <header className={styles.header}>
        <h1 className={styles.heading}>신청 관리</h1>
        <div className={styles.headerActions}>
          <Link className={styles.link} to="/admin/edit">
            청첩장 편집
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            로그아웃
          </Button>
        </div>
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
                    <td>{row.slug}</td>
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
