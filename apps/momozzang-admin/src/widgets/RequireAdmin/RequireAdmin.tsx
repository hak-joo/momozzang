import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Panel, PanelScreen } from '../../shared/ui/Panel';
import { useAdminSession, useSignOutMutation } from '../../features/auth/useAdminSession';

/**
 * 관리자 전용 라우트 가드.
 *
 * **핵심 불변식: 아래 세 갈래 중 어느 것도 `children` 을 렌더하지 않는다.**
 * 세션 판정이 끝나기 전에 보호 라우트의 자식이 마운트되면 그 안의 데이터 쿼리가
 * 미인증 상태로 발사된다. 자식을 아예 만들지 않는 것이 구조적 보장이고,
 * `useInvitationListQuery` 의 필수 `enabled` 인자가 두 번째 방어선이다.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const sessionQuery = useAdminSession();
  const signOut = useSignOutMutation();

  if (sessionQuery.isPending) {
    return (
      <PanelScreen>
        <Panel title="관리자 확인">세션을 확인하는 중입니다.</Panel>
      </PanelScreen>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <Navigate to="/login" replace />;
  }

  if (!sessionQuery.data.isAdmin) {
    return (
      <PanelScreen>
        <Panel title="접근 불가">
          관리자 권한이 없습니다.
          <Button variant="secondary" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            로그아웃
          </Button>
        </Panel>
      </PanelScreen>
    );
  }

  return <>{children}</>;
}

export default RequireAdmin;
