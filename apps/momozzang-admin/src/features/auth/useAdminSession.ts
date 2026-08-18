import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthRepository } from './authRepositoryFactory';
import type { AdminSession } from './types';

export interface AdminSessionState {
  session: AdminSession;
  isAdmin: boolean;
}

export const ADMIN_SESSION_QUERY_KEY = ['admin-session'] as const;

/**
 * 세션 판정과 관리자 판정을 **한 쿼리에 묶는다.**
 * 둘을 따로 두면 "세션은 왔는데 관리자 판정은 아직" 인 중간 상태가 생기고,
 * 그 틈에 보호 라우트의 자식이 마운트돼 미인증 데이터 요청이 새어 나간다.
 *
 * `retry: false` — 인증 실패를 재시도로 늘리지 않는다. 실패는 곧 "세션 없음" 으로 취급한다.
 */
export function useAdminSession() {
  return useQuery<AdminSessionState | null>({
    queryKey: ADMIN_SESSION_QUERY_KEY,
    queryFn: async () => {
      const repo = getAuthRepository();
      const session = await repo.getSession();
      if (!session) {
        return null;
      }

      const isAdmin = await repo.isAdmin(session.email);
      return { session, isAdmin };
    },
    retry: false,
  });
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * 로그인. 성공하면 세션 쿼리를 무효화해 `useAdminSession()` 이 즉시 재판정하게 한다.
 * 관리자 여부는 여기서 판정하지 않는다 — 로그인 성공과 관리자 권한은 별개다.
 */
export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: SignInParams) => {
      const repo = getAuthRepository();
      return repo.signIn(email, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
    },
  });
}

/**
 * 로그아웃도 react-query 로 다룬다. 페이지·위젯이 팩토리를 직접 부르지 않게 하려고
 * 세션 훅과 같은 파일에 둔다(같은 쿼리 키를 무효화하는 한 쌍이다).
 */
export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const repo = getAuthRepository();
      await repo.signOut();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
    },
  });
}
