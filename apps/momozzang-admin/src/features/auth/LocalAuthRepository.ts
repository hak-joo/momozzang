import type { AdminSession, AuthRepository } from './types';

/**
 * 로컬(비-supabase) 데이터소스 전용 관리자 인증 구현.
 *
 * 값(관리자 이메일 목록·비밀번호)은 저장소에 두지 않고 환경변수 2개로 주입한다.
 * - `VITE_ADMIN_EMAILS`      : 쉼표 구분 관리자 이메일 목록. `isAdmin` 이 읽는다.
 * - `VITE_LOCAL_ADMIN_PASSWORD` : 단일 평문 비밀번호. `signIn` 이 읽는다.
 *
 * 세션은 `window.localStorage` 의 `momozzang:admin-session` 키에 `{ email }` 만 저장한다.
 * `momozzang:invitation:` 접두사와 겹치지 않게 두어, "미인증 상태에서 청첩장 데이터를
 * 읽지 않는다" 는 관측이 세션 읽기에 오염되지 않게 한다.
 * 권한 플래그(`isAdmin` 같은 것)는 **저장하지 않는다** — 권한은 매번 재판정한다.
 */

const ADMIN_SESSION_KEY = 'momozzang:admin-session';

const INVALID_CREDENTIALS_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';
const NO_LOCAL_PASSWORD_MESSAGE =
  '로컬 관리자 비밀번호가 설정되지 않았습니다. VITE_LOCAL_ADMIN_PASSWORD 를 설정해 주세요.';
const SUPABASE_MODE_MESSAGE =
  'LocalAuthRepository 는 VITE_DATA_SOURCE !== "supabase" 에서만 사용할 수 있습니다.';

export class LocalAuthRepository implements AuthRepository {
  constructor() {
    // 이 구현은 로컬 데이터소스 전용이다. 팩토리가 실수로 supabase 모드에서 이 클래스를
    // 고르면 조용히 통과시키지 않고 즉시 실패시킨다(경계 위반 트립와이어).
    if (import.meta.env.VITE_DATA_SOURCE === 'supabase') {
      throw new Error(SUPABASE_MODE_MESSAGE);
    }
  }

  /**
   * 비밀번호만 대조하고, 관리자 여부는 `isAdmin` 이 따로 판정한다.
   * 즉 올바른 비밀번호면 어떤 이메일로도 로그인 자체는 성립한다 — 이 관대함은
   * **로컬 데이터소스 한정 개발 편의**이며 SupabaseAuthRepository 에는 존재하지 않는다.
   * 덕분에 "로그인은 됐지만 관리자가 아닌" 경계 상황을 로컬에서 그대로 재현할 수 있다.
   */
  async signIn(email: string, password: string): Promise<AdminSession> {
    const configured = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD;
    if (!configured) {
      throw new Error(NO_LOCAL_PASSWORD_MESSAGE);
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || password !== configured) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const session: AdminSession = { email: normalized };
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  async getSession(): Promise<AdminSession | null> {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AdminSession>;
      return typeof parsed.email === 'string' ? { email: parsed.email } : null;
    } catch {
      return null;
    }
  }

  async isAdmin(email: string): Promise<boolean> {
    const raw = import.meta.env.VITE_ADMIN_EMAILS;
    if (!raw) {
      return false;
    }

    const allow = String(raw)
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    return allow.includes(email.trim().toLowerCase());
  }
}
