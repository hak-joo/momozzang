import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { useAdminConfirm } from '../../shared/ui/ConfirmDialog';
import { useAdminToast } from '../../shared/ui/Toast';
import type {
  InvitationStatus,
  InvitationSummary,
  WeddingInvitation,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Panel } from '../../shared/ui/Panel';
import { AdminTopBar } from '../../widgets/AdminTopBar/AdminTopBar';
import { useAdminSession } from '../../features/auth/useAdminSession';
import { useInvitationListQuery } from '../../features/invitation/api/useInvitationListQuery';
import { useInvitationStatusMutation } from '../../features/invitation/api/useInvitationStatusMutation';
import { useInvitationRecordQuery } from '../../features/invitation/api/useInvitationRecordQuery';
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
  /** 인라인 오류는 **행 단위**로 남는다. 토스트가 사라져도 무엇이 실패했는지 화면에 남아야 한다. */
  const [failedSlug, setFailedSlug] = useState<string | null>(null);
  const askConfirm = useAdminConfirm();
  const toast = useAdminToast();

  const listQuery = useInvitationListQuery(filter === 'all' ? undefined : filter, {
    enabled: sessionQuery.data?.isAdmin === true,
  });
  const statusMutation = useInvitationStatusMutation();

  const rows: InvitationSummary[] = listQuery.data ?? [];

  /**
   * 펼친 행은 한 번에 하나다. 조회는 `enabled` 하나로만 열리므로 "목록 진입 시 N건 일괄 조회"는
   * 코드 경로 자체가 없다 — 펼치기 전에는 `enabled: false` 라 요청이 만들어지지 않는다.
   */
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const previewQuery = useInvitationRecordQuery(expandedSlug, {
    enabled: expandedSlug !== null,
  });

  const isRowBusy = (slug: string) =>
    statusMutation.isPending && statusMutation.variables?.slug === slug;

  /**
   * 승인·반려는 되돌리기 어려운 공개 상태 변경이다. 확인 대화를 먼저 띄우고,
   * 취소하면 **요청을 만들지 않는다**(mutate 를 부르지 않는다).
   *
   * 결과는 두 겹으로 알린다 — 비차단 토스트(즉시 눈에 띔) + 행 인라인 오류(토스트가 사라져도 남음).
   * `승인 대기` 필터에서는 성공하면 그 행이 목록에서 사라지므로, 토스트 문구에 슬러그를 넣어
   * "무엇이 처리됐는지"를 잃지 않게 한다.
   */
  const handleDecision = async (slug: string, status: InvitationStatus) => {
    const approving = status === 'approved';
    const accepted = await askConfirm({
      title: approving ? '승인하시겠어요?' : '반려하시겠어요?',
      description: approving
        ? `${slug} 청첩장이 공개됩니다. 주소를 아는 누구나 볼 수 있게 됩니다.`
        : `${slug} 청첩장은 공개되지 않습니다. 하객이 주소로 접속해도 안내 화면만 보입니다.`,
      confirmText: approving ? '승인' : '반려',
      destructive: !approving,
    });
    if (!accepted) return;

    setFailedSlug((prev) => (prev === slug ? null : prev));
    statusMutation.mutate(
      { slug, status },
      {
        onSuccess: () => {
          toast.success({
            title: approving ? '승인했습니다.' : '반려했습니다.',
            description: approving
              ? `${slug} 청첩장이 공개되었습니다.`
              : `${slug} 청첩장은 공개되지 않습니다.`,
          });
        },
        onError: () => {
          setFailedSlug(slug);
          toast.error({
            title: '처리하지 못했습니다.',
            description: '잠시 후 다시 시도해 주세요.',
          });
        },
      },
    );
  };

  /** 이미 선택된 필터를 다시 누르면 목록을 재조회한다(저장소가 바뀐 뒤의 수동 갱신 경로). */
  const handleFilter = (value: StatusFilter) => {
    if (value === filter) {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      return;
    }
    setFilter(value);
  };

  const handleTogglePreview = (slug: string) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  };

  /**
   * 예식 일시는 `toLocaleString` 을 쓰지 않는다 — 로케일·타임존에 따라 문자열이 흔들려
   * 화면에 보이는 값이 실행 환경마다 달라진다. 저장된 필드(date/ampm/hour/minute)를 그대로 조립한다.
   */
  const formatWeddingDateTime = (hall: WeddingInvitation['weddingHallInfo']) => {
    const [year, month, day] = (hall.date ?? '').split('-');
    if (!year || !month || !day) return '';
    const meridiem = hall.ampm === 'AM' ? '오전' : '오후';
    return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일 ${meridiem} ${hall.hour}시 ${hall.minute}분`;
  };

  const previewRecord = previewQuery.data ?? null;
  const previewFailed = !previewQuery.isPending && (previewQuery.isError || previewRecord === null);

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
                  <th scope="col">내용</th>
                  <th scope="col">상태</th>
                  <th scope="col">신청일</th>
                  {/* T12: 삽입 지점은 독립성 기준 — 스프린트 3 계약 §5.1.
                      `신랑·신부` 가 `신청일` 뒤에 오는 것은 서술 흐름이 아니라, 같은 파일을
                      만지는 T3 의 삽입 지점(연락처 뒤)과 공통 문맥을 남기기 위한 배치다. */}
                  <th scope="col">신랑·신부</th>
                  <th scope="col">예식일</th>
                  <th scope="col">처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.slug}>
                  <tr
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
                      <button
                        type="button"
                        className={styles.previewToggle}
                        data-testid="approvals-preview-toggle"
                        aria-expanded={expandedSlug === row.slug ? 'true' : 'false'}
                        disabled={isRowBusy(row.slug)}
                        onClick={() => handleTogglePreview(row.slug)}
                      >
                        {expandedSlug === row.slug ? '내용 닫기' : '내용 보기'}
                      </button>
                    </td>
                    <td>
                      <span className={styles.badge} data-badge={row.status}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td>{formatDateTime(row.createdAt)}</td>
                    {/* T12: 삽입 지점은 독립성 기준 — 스프린트 3 계약 §5.1.
                        헤더와 같은 컬럼 인덱스(신청일 뒤)라 정렬이 어긋나지 않는다.
                        예식일은 toLocaleDateString 을 쓰지 않는다 — 로케일에 따라 표기가
                        달라지면 값 판정이 흔들린다. YYYY-MM-DD 를 직접 잘라 쓴다. */}
                    <td data-testid="approvals-couple-cell">
                      {row.groomName && row.brideName
                        ? `${row.groomName} · ${row.brideName}`
                        : '-'}
                    </td>
                    <td data-testid="approvals-date-cell">
                      {row.weddingDate
                        ? `${Number(row.weddingDate.slice(0, 4))}년 ${Number(
                            row.weddingDate.slice(5, 7),
                          )}월 ${Number(row.weddingDate.slice(8, 10))}일`
                        : '-'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          size="sm"
                          data-testid="approvals-approve"
                          disabled={isRowBusy(row.slug)}
                          onClick={() => void handleDecision(row.slug, 'approved')}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          data-testid="approvals-reject"
                          disabled={isRowBusy(row.slug)}
                          onClick={() => void handleDecision(row.slug, 'rejected')}
                        >
                          반려
                        </Button>
                        {failedSlug === row.slug ? (
                          <p
                            className={styles.rowError}
                            role="alert"
                            data-testid="approvals-row-error"
                          >
                            처리하지 못했습니다. 잠시 후 다시 시도해 주세요.
                          </p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedSlug === row.slug ? (
                    <tr className={styles.previewRow} data-testid="approvals-preview-row">
                      <td colSpan={6}>
                        {previewQuery.isPending ? (
                          <p
                            className={styles.previewNotice}
                            data-testid="approvals-preview-loading"
                          >
                            내용을 불러오는 중입니다.
                          </p>
                        ) : null}

                        {previewFailed ? (
                          <div className={styles.previewNotice}>
                            <p role="alert" data-testid="approvals-preview-error">
                              내용을 불러오지 못했습니다.
                            </p>
                            <button
                              type="button"
                              className={styles.previewRetry}
                              data-testid="approvals-preview-retry"
                              onClick={() => void previewQuery.refetch()}
                            >
                              다시 시도
                            </button>
                          </div>
                        ) : null}

                        {previewRecord ? (
                          <div className={styles.previewCard} data-testid="approvals-preview-card">
                            {(() => {
                              const body = previewRecord.data;
                              const thumb = body.images.find((image) => image.isRepresentative);
                              return (
                                <>
                                  {thumb ? (
                                    <img
                                      className={styles.previewThumb}
                                      data-testid="approvals-preview-thumb"
                                      src={thumb.url}
                                      alt="대표 이미지 미리보기"
                                    />
                                  ) : null}
                                  <div className={styles.previewBody}>
                                    <p
                                      className={styles.previewTitle}
                                      data-testid="approvals-preview-title"
                                    >
                                      {body.invitationInfo.title}
                                    </p>
                                    <p data-testid="approvals-preview-couple">
                                      {`${body.couple.groom.name} · ${body.couple.bride.name}`}
                                    </p>
                                    <p data-testid="approvals-preview-datetime">
                                      {formatWeddingDateTime(body.weddingHallInfo)}
                                    </p>
                                    <p data-testid="approvals-preview-hall">
                                      {`${body.weddingHallInfo.hallName} ${body.weddingHallInfo.hallDetail} · ${body.weddingHallInfo.address}`}
                                    </p>
                                    <p data-testid="approvals-preview-photos">
                                      {`사진 ${body.album.length}장`}
                                    </p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
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
