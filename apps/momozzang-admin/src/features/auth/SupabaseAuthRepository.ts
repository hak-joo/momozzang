import { supabase } from '@momozzang/ui/src/shared/lib/supabase';
import type { AdminSession, AuthRepository } from './types';

/**
 * Supabase 데이터소스용 관리자 인증 구현.
 *
 * 관리자 판정은 **`public.admin_users` 테이블 조회**다. 커밋된 `business_flow.sql` 에는
 * 커스텀 JWT 클레임을 심는 DDL 이 없고, `authenticated` 에 대한 select grant + RLS 정책
 * (`auth.jwt() ->> 'email' = email`)만 있다. 즉 로그인 사용자는 자기 행만 조회할 수 있고,
 * 조회되면 관리자다.
 *
 * 실패 메시지는 LocalAuthRepository 와 **같은 한국어 문자열**을 쓴다. 두 데이터소스가
 * 같은 화면 처리로 끝나야 하고, 계정 존재 여부가 영문 원문으로 새어 나가지 않게 한다.
 */

const INVALID_CREDENTIALS_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string): Promise<AdminSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const signedInEmail = data.user?.email;
    if (!signedInEmail) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    return { email: signedInEmail };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AdminSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }

    const email = data.session?.user?.email;
    return email ? { email } : null;
  }

  /**
   * `.maybeSingle()` 을 쓴다. 관리자가 아닌 계정은 0행이 **정상 경로**이고,
   * `.single()` 은 그것을 PGRST116 에러로 둔갑시킨다.
   * `.eq('email', email)` 은 중복 방어다 — RLS 가 이미 자기 행만 보이게 하지만,
   * 정책이 바뀌어도 다른 사람의 행으로 관리자 판정이 나지 않게 한다.
   */
  async isAdmin(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data !== null;
  }
}
