/**
 * 관리자 인증 Repository 계약.
 *
 * 이 파일은 **타입만** 담는다. 구현·환경변수 읽기·데이터 클라이언트 import 를 넣지 않는다.
 *
 * `getSession()` 은 "세션이 있는가"만 답하고, 관리자 여부는 `isAdmin()` 이 따로 답한다.
 * 이 분리가 "세션 없음 → /login" 과 "세션은 있으나 관리자 아님 → 접근 불가 화면" 을
 * 서로 다른 화면으로 가르는 근거다.
 */

export interface AdminSession {
  email: string;
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<AdminSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AdminSession | null>;
  isAdmin(email: string): Promise<boolean>;
}
