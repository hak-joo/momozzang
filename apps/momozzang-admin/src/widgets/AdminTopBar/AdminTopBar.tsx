import { NavLink } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { useAdminSession, useSignOutMutation } from '../../features/auth/useAdminSession';
import styles from './AdminTopBar.module.css';

/**
 * 보호 라우트(`/admin`, `/admin/edit`)가 공유하는 관리자 상단바.
 *
 * **`RequireAdmin` 바깥에 두지 않는다.** 공통 레이아웃 라우트로 올리면 세션 판정 전에 상단바가
 * 마운트되고, 그 안의 `useAdminSession` 이 가드보다 먼저 화면을 그리게 된다. 각 보호 페이지의
 * 최상단에서 렌더해 "세션 판정 전에는 아무것도 마운트되지 않는다" 는 가드 불변식을 유지한다.
 *
 * 현재 화면 표시는 `NavLink` 의 `aria-current="page"` 에 맡긴다. `/admin/edit` 도 `/admin` 으로
 * 시작하므로 승인 목록 링크에는 `end` 를 붙여야 두 링크가 동시에 활성화되지 않는다.
 */
export function AdminTopBar() {
  const sessionQuery = useAdminSession();
  const signOut = useSignOutMutation();
  const email = sessionQuery.data?.session.email ?? '';

  return (
    <nav className={styles.bar} aria-label="관리자 화면 이동" data-testid="admin-topbar">
      <div className={styles.links}>
        <NavLink className={styles.link} to="/admin" end data-testid="admin-topbar-approvals">
          신청 관리
        </NavLink>
        <NavLink className={styles.link} to="/admin/edit" data-testid="admin-topbar-editor">
          청첩장 편집
        </NavLink>
      </div>

      <div className={styles.account}>
        <span className={styles.email} data-testid="admin-topbar-email">
          {email}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          data-testid="admin-topbar-signout"
        >
          로그아웃
        </Button>
      </div>
    </nav>
  );
}

export default AdminTopBar;
