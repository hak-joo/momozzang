import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { useAdminConfirm } from '../ui/ConfirmDialog';

/**
 * 미저장 변경사항이 있을 때 SPA 라우팅 이동(useBlocker)과 탭 닫기/새로고침(beforeunload)을 차단합니다.
 */
export function useUnsavedChangesBlocker(isDirty: boolean) {
  const askConfirm = useAdminConfirm();

  const blocker = useBlocker(
    useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      askConfirm({
        title: '수정사항이 저장되지 않았습니다.',
        description: '페이지를 이동하시면 작성 중인 내용이 모두 사라집니다. 정말 이동하시겠습니까?',
        confirmText: '이동하기',
        cancelText: '취소',
        destructive: true,
      }).then((confirmed) => {
        if (confirmed) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      });
    }
  }, [blocker, askConfirm]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: { preventDefault: () => void; returnValue?: string }) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
