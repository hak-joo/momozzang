import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { useInvitationMutation } from '../../features/invitation/api/useInvitationMutation';
import { validateInvitation, type ValidationIssue } from '../../features/apply/validateInvitation';
import type { useApplyForm } from '../../features/apply/useApplyForm';
import styles from './PublishStep.module.css';

type Form = ReturnType<typeof useApplyForm>;

interface Props {
  invitation: WeddingInvitation;
  onLoad: Form['loadInvitation'];
  /** 저장 시 단일+갤러리 pending 을 일괄 업로드하고 키 치환 invitation 반환(F3·완료정의7). */
  commitPendingUploads: Form['commitPendingUploads'];
  /** 저장 성공 후 commit 에 포함된 pending blob revoke+clear(F7-b). */
  clearCommittedPending: Form['clearCommittedPending'];
  /** 신청 메타데이터(F3) — 저장 전 검증 대상이며 화면에 되뱉지 않는다. */
  editPassword: string;
  applicantContact: string;
}

/**
 * 스텝 ③ — 신청 접수(F3).
 *
 * - 슬러그 문자열만 알면 남의 청첩장을 폼으로 통째 불러오던 **무인증 조회 UI 를 제거**했다.
 *   신청자의 수정 경로는 편집 비밀번호 게이트가 있는 `/edit` 이고, 관리자 경로는 `/admin/edit` 이다.
 * - 필수값/형식 검증은 `validateInvitation` 로 저장 전 차단한다.
 */
export function PublishStep({
  invitation,
  onLoad,
  commitPendingUploads,
  clearCommittedPending,
  editPassword,
  applicantContact,
}: Props) {
  // ── 저장(제작 완료) ──
  const mutation = useInvitationMutation();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  // F3: commit(업로드) 단계 진행 상태. mutation.isPending(저장 단계)와 합쳐 버튼/라벨을 제어한다.
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = useCallback(async () => {
    if (isUploading || mutation.isPending) return;
    setSaveMessage(null);
    const found = validateInvitation(invitation, { editPassword, applicantContact });
    setIssues(found);
    if (found.length > 0) {
      // F14 필수값 누락 안내 — commit/저장 모두 호출하지 않음.
      return;
    }

    // F3·완료정의7: 저장 시점에 비로소 단일 5슬롯 + 갤러리 pending 을 일괄 업로드한다.
    // F6(원자성): 한 장이라도 실패하면 throw → mutation 미호출 + pending 유지(재시도 가능).
    let toSave: WeddingInvitation;
    try {
      setIsUploading(true);
      toSave = await commitPendingUploads();
    } catch (err) {
      setSaveMessage({
        kind: 'error',
        text: `이미지 업로드에 실패했습니다: ${
          err instanceof Error ? err.message : '알 수 없는 오류'
        }. 다시 시도해 주세요.`,
      });
      return; // pending 유지(clearCommittedPending 미호출).
    } finally {
      setIsUploading(false);
    }

    const slug = invitation.invitationInfo.url.trim();
    mutation.mutate(
      { slug, data: toSave },
      {
        onSuccess: () => {
          setSavedSlug(slug);
          setSaveMessage({ kind: 'success', text: '청첩장이 저장(제작)되었습니다.' });
          // 키 치환된 결과로 폼 state 갱신(blob→키, 미리보기 깨짐 방지) + commit blob revoke+clear(F7-b).
          onLoad(toSave);
          clearCommittedPending();
        },
        onError: (err) => {
          setSaveMessage({
            kind: 'error',
            text: `저장에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
          });
        },
      },
    );
  }, [
    invitation,
    mutation,
    isUploading,
    commitPendingUploads,
    clearCommittedPending,
    onLoad,
    editPassword,
    applicantContact,
  ]);

  // F3: 저장 버튼 라벨/비활성 — 업로드 중 → 저장 중 → 평시.
  const isBusy = isUploading || mutation.isPending;
  const saveLabel = isUploading ? '업로드 중...' : mutation.isPending ? '저장 중...' : '저장(제작)';

  const completeLink = savedSlug ? `/m/${savedSlug}` : null;
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!completeLink) return;
    const full = `${window.location.origin}${completeLink}`;
    navigator.clipboard?.writeText(full).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  }, [completeLink]);

  return (
    <div className={styles.step}>
      {/* F14 저장 / 제작 완료 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>저장 / 제작 완료</h3>
        <p className={styles.hint}>
          현재 슬러그: <strong>{invitation.invitationInfo.url.trim() || '(미입력)'}</strong> — 운영
          데이터 오염 방지를 위해 검증 전용 슬러그로 저장하세요.
        </p>

        {/* F14·F15 필수값 누락 안내 */}
        {issues.length > 0 && (
          <div className={clsx(styles.banner, styles.bannerError)} data-testid="publish-issues">
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

        <div className={styles.actions}>
          <Button onClick={handleSave} disabled={isBusy} data-testid="publish-save">
            {saveLabel}
          </Button>
        </div>

        {saveMessage && (
          <div
            className={clsx(
              styles.banner,
              saveMessage.kind === 'success' ? styles.bannerSuccess : styles.bannerError,
            )}
            data-testid="publish-save-message"
          >
            {saveMessage.text}
          </div>
        )}

        {/* 제작 완료 링크 */}
        {completeLink && (
          <div className={clsx(styles.banner, styles.bannerInfo)}>
            <div className={styles.completeLink}>
              <span>완성된 청첩장 링크</span>
              <div className={styles.linkRow}>
                <a
                  className={styles.linkText}
                  href={completeLink}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="publish-complete-link"
                >
                  {completeLink}
                </a>
                <Button onClick={handleCopy}>{copied ? '복사됨!' : '링크 복사'}</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
