import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { useInvitationCreateMutation } from '../../features/invitation/api/useInvitationCreateMutation';
import { validateInvitation, type ValidationIssue } from '../../features/apply/validateInvitation';
import type { useApplyForm } from '../../features/apply/useApplyForm';
import styles from './PublishStep.module.css';

type Form = ReturnType<typeof useApplyForm>;

/**
 * 중복 슬러그 메시지. 로컬 Repository 와 Supabase `create_invitation` RPC 가 같은 문자열을 던진다.
 * PostgREST 가 RPC 예외를 감싸 접두사가 붙을 수 있어 `includes` 로 판정한다.
 */
const DUPLICATE_SLUG_MESSAGE = '이미 사용 중인 슬러그입니다.';

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
 * - 저장은 `useInvitationCreateMutation` 훅 경유다(위젯이 Repository 팩토리를 직접 부르지 않는다).
 *   신규 행은 `status='pending'` + 해시된 편집 비밀번호로 만들어지고, 같은 슬러그가 이미 있으면
 *   Repository 가 선검사 후 예외를 던져 **기존 행을 덮어쓰지 않는다**.
 * - 슬러그 문자열만 알면 남의 청첩장을 폼으로 통째 불러오던 **무인증 조회 UI 를 제거**했다.
 *   신청자의 수정 경로는 편집 비밀번호 게이트가 있는 `/edit` 이고, 관리자 경로는 `/admin/edit` 이다.
 * - 필수값/형식 검증은 `validateInvitation` 로 저장 전 차단한다(검증 실패 시 업로드도 하지 않는다).
 */
export function PublishStep({
  invitation,
  onLoad,
  commitPendingUploads,
  clearCommittedPending,
  editPassword,
  applicantContact,
}: Props) {
  const createMutation = useInvitationCreateMutation();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  // F3: commit(업로드) 단계 진행 상태. createMutation.isPending(저장 단계)와 합쳐 버튼/라벨을 제어한다.
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = useCallback(async () => {
    if (isUploading || createMutation.isPending) return;
    setSaveMessage(null);
    // 1) 검증 — 실패하면 업로드도 저장도 호출하지 않는다(신규 행이 생길 수 없다).
    const found = validateInvitation(invitation, { editPassword, applicantContact });
    setIssues(found);
    if (found.length > 0) {
      return;
    }

    // 2) F3·완료정의7: 저장 시점에 비로소 단일 5슬롯 + 갤러리 pending 을 일괄 업로드한다.
    // F6(원자성): 한 장이라도 실패하면 throw → 저장 미호출 + pending 유지(재시도 가능).
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

    // 3) 신규 신청 생성. 중복 판정은 Repository/RPC 의 원자적 선검사에만 의존한다
    //    (사전 조회로 막으면 무인증 조회 경로가 되살아나고, Supabase 에서는 anon 이 pending 을
    //     읽지 못해 항상 "없음"으로 오판한다).
    const slug = invitation.invitationInfo.url.trim();
    createMutation.mutate(
      { slug, data: toSave, editPassword, applicantContact },
      {
        onSuccess: () => {
          setSavedSlug(slug);
          // 키 치환된 결과로 폼 state 갱신(blob→키, 미리보기 깨짐 방지) + commit blob revoke+clear(F7-b).
          onLoad(toSave);
          clearCommittedPending();
        },
        onError: (err) => {
          const raw = err instanceof Error ? err.message : '';
          setSaveMessage({
            kind: 'error',
            text: raw.includes(DUPLICATE_SLUG_MESSAGE)
              ? DUPLICATE_SLUG_MESSAGE
              : `신청 저장에 실패했습니다: ${raw || '알 수 없는 오류'}`,
          });
        },
      },
    );
  }, [
    invitation,
    createMutation,
    isUploading,
    commitPendingUploads,
    clearCommittedPending,
    onLoad,
    editPassword,
    applicantContact,
  ]);

  // F3: 저장 버튼 라벨/비활성 — 업로드 중 → 저장 중 → 평시.
  const isBusy = isUploading || createMutation.isPending;
  const saveLabel = isUploading
    ? '업로드 중...'
    : createMutation.isPending
      ? '저장 중...'
      : '신청하기';

  return (
    <div className={styles.step}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>신청 접수</h3>

        {savedSlug === null ? (
          <>
            <p className={styles.hint}>
              현재 주소(슬러그):{' '}
              <strong>{invitation.invitationInfo.url.trim() || '(미입력)'}</strong> — 신청 후에는 이
              주소로 청첩장이 만들어집니다.
            </p>

            {/* 필수값 누락 안내 — 메시지에 입력값을 넣지 않는다(비밀번호·연락처 노출 방지). */}
            {issues.length > 0 && (
              <div className={clsx(styles.banner, styles.bannerError)} data-testid="publish-issues">
                <strong>신청하려면 아래 항목을 확인해 주세요:</strong>
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
          </>
        ) : (
          /*
            접수 완료 후에는 저장 섹션을 감춘다. 같은 슬러그로 한 번 더 누르면 이제
            '이미 사용 중인 슬러그입니다.' 로 튕기므로, 방금 자기가 만든 행 때문에 실패하는
            화면을 신청자에게 보여주지 않는다. 수정 경로는 /edit 이다.
            /edit 는 링크가 아니라 텍스트로만 안내한다.
          */
          <div className={clsx(styles.banner, styles.bannerInfo)} data-testid="publish-complete">
            <strong>신청이 접수되었습니다.</strong>
            <p>
              확정된 주소(슬러그): <strong data-testid="publish-complete-slug">{savedSlug}</strong>
            </p>
            <p>관리자 승인 후 공개됩니다. 승인 결과는 입력하신 연락처로 안내드립니다.</p>
            <p>
              내용을 수정하려면 <code>/edit</code> 에서 슬러그와 편집 비밀번호로 진입해 주세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
