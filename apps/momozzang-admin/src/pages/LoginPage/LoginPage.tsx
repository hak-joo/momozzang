import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input';
import { Panel, PanelScreen } from '../../shared/ui/Panel';
import { useAdminSession, useSignInMutation } from '../../features/auth/useAdminSession';
import styles from './LoginPage.module.css';

/**
 * 관리자 로그인 화면.
 *
 * 이미 관리자 세션이 있으면 폼을 그리지 않고 곧장 `/admin` 으로 보낸다.
 * 세션 조회 중에는 폼 대신 안내 문구만 보여준다 — 로그인 폼이 깜빡였다가 사라지는 것을 막는다.
 * 로그인 성공 시에는 관리자 여부와 무관하게 `/admin` 으로 이동하고, 권한 판정은
 * 라우트 가드(`RequireAdmin`)가 맡는다.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const sessionQuery = useAdminSession();
  const signIn = useSignInMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (sessionQuery.data?.isAdmin === true) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/admin', { replace: true });
        },
      },
    );
  };

  return (
    <PanelScreen>
      <Panel title="관리자 로그인">
        {sessionQuery.isPending ? (
          <p className={styles.notice}>세션을 확인하는 중입니다.</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-email">
                이메일
              </label>
              <Input
                id="admin-email"
                type="email"
                aria-required="true"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-password">
                비밀번호
              </label>
              <Input
                id="admin-password"
                type="password"
                aria-required="true"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {signIn.isError ? (
              <p className={styles.error} role="alert">
                {signIn.error.message}
              </p>
            ) : null}

            <Button type="submit" fullWidth disabled={signIn.isPending}>
              {signIn.isPending ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        )}
      </Panel>
    </PanelScreen>
  );
}

export default LoginPage;
