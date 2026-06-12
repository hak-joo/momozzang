import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { useInvitationQuery } from '../../features/invitation/api/useInvitationQuery';
import { useInvitationMutation } from '../../features/invitation/api/useInvitationMutation';
import {
  validateInvitation,
  type ValidationIssue,
} from '../../features/apply/validateInvitation';
import type { useApplyForm } from '../../features/apply/useApplyForm';
import styles from './PublishStep.module.css';

type Form = ReturnType<typeof useApplyForm>;

interface Props {
  invitation: WeddingInvitation;
  onLoad: Form['loadInvitation'];
}

/**
 * 스텝 ③ — 불러오기 / 저장(제작 완료) / 라운드트립 (F14·F15).
 *
 * - 저장은 반드시 `useInvitationMutation`(=`getInvitationRepository().updateInvitation`) 경유([G2]).
 * - 불러오기는 `useInvitationQuery`(=`getInvitation`) 경유. 검증 전용 슬러그 사용 권장([G2]).
 * - 필수값/형식 검증은 `validateInvitation`로 저장 전 차단(F14·F15).
 */
export function PublishStep({ invitation, onLoad }: Props) {
  // ── 불러오기 슬러그(폼의 url과 별개 입력) ──
  const [loadSlug, setLoadSlug] = useState('');
  // useInvitationQuery로 트리거하기 위한 활성 슬러그
  const [activeLoadSlug, setActiveLoadSlug] = useState('');
  const loadQuery = useInvitationQuery(activeLoadSlug);

  const [loadMessage, setLoadMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  );

  // 불러오기 결과가 도착하면 폼 전체를 교체한다(F14).
  const [pendingLoad, setPendingLoad] = useState(false);
  useEffect(() => {
    if (!pendingLoad) return;
    if (loadQuery.isLoading) return;
    if (loadQuery.data) {
      onLoad(loadQuery.data);
      setLoadMessage({ kind: 'success', text: `'${activeLoadSlug}' 청첩장을 불러왔습니다.` });
    } else if (loadQuery.isError || loadQuery.data === null) {
      setLoadMessage({ kind: 'error', text: '해당 슬러그의 청첩장을 불러오지 못했습니다.' });
    }
    setPendingLoad(false);
  }, [pendingLoad, loadQuery.isLoading, loadQuery.data, loadQuery.isError, onLoad, activeLoadSlug]);

  const handleLoad = useCallback(() => {
    const slug = loadSlug.trim();
    if (!slug) {
      setLoadMessage({ kind: 'error', text: '불러올 슬러그를 입력해 주세요.' });
      return;
    }
    setLoadMessage(null);
    setActiveLoadSlug(slug);
    setPendingLoad(true);
    // 동일 슬러그 재불러오기(라운드트립 검증)에서도 최신값을 받도록 무효화 후 재조회.
    loadQuery.refetch();
  }, [loadSlug, loadQuery]);

  // ── 저장(제작 완료) ──
  const mutation = useInvitationMutation();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    setSaveMessage(null);
    const found = validateInvitation(invitation);
    setIssues(found);
    if (found.length > 0) {
      // F14 필수값 누락 안내 — 저장 mutation 호출하지 않음.
      return;
    }
    const slug = invitation.invitationInfo.url.trim();
    mutation.mutate(
      { slug, data: invitation },
      {
        onSuccess: () => {
          setSavedSlug(slug);
          setSaveMessage({ kind: 'success', text: '청첩장이 저장(제작)되었습니다.' });
        },
        onError: (err) => {
          setSaveMessage({
            kind: 'error',
            text: `저장에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
          });
        },
      },
    );
  }, [invitation, mutation]);

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
      {/* F14 불러오기 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기존 청첩장 불러오기</h3>
        <p className={styles.hint}>
          검증 전용 슬러그(예: <code>harness-qa-3</code>)로 저장한 데이터를 다시 불러와 폼을 채웁니다.
        </p>
        <div className={styles.loadRow}>
          <Input
            className={styles.loadInput}
            value={loadSlug}
            onChange={(e) => setLoadSlug(e.target.value)}
            placeholder="불러올 슬러그"
            data-testid="publish-load-slug"
          />
          <Button onClick={handleLoad} disabled={pendingLoad && loadQuery.isLoading}>
            불러오기
          </Button>
        </div>
        {loadMessage && (
          <div
            className={clsx(
              styles.banner,
              loadMessage.kind === 'success' ? styles.bannerSuccess : styles.bannerError,
            )}
            data-testid="publish-load-message"
          >
            {loadMessage.text}
          </div>
        )}
      </section>

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
          <Button onClick={handleSave} disabled={mutation.isPending} data-testid="publish-save">
            {mutation.isPending ? '저장 중...' : '저장(제작)'}
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
