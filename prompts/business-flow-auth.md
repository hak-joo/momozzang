# 실행 프롬프트: 비즈니스 플로우 정착 (온보딩 · 승인 · 편집 접근제어)

> 이 문서는 AI 코딩 에이전트가 그대로 실행하는 프롬프트다.

## 1. 요구사항

**목적:** 소개 → 신청 → 관리자 승인 → 사용자 편집 → 하객 공개로 이어지는 단일 비즈니스 플로우를 코드로 강제해, 슬러그만 알면 누구나 편집·열람할 수 있는 현재 구조를 차단한다.

**동작 명세:**

- 입력 1 — 방문자가 `http://localhost:5173/` (invitation 앱 루트)에 접속
  - 처리: `apps/momozzang-invitation/src/page/AppWrapper.tsx`의 `/` 라우트가 데모 청첩장(`Invitation.tsx`) 대신 신설 `OnboardingPage`를 렌더
  - 출력: 서비스 소개 화면 + "청첩장 신청하기" CTA 앵커(`<a>`)가 표시되고, 그 `href`는 환경변수 `VITE_APPLY_URL` 값과 문자열이 일치

- 입력 2 — 방문자가 `http://localhost:5173/{slug}`에 접속
  - 처리: `InvitationById.tsx`가 조회 결과의 `status` 값을 확인
  - 출력: `status === 'approved'`면 기존 `InvitationExperience`를 렌더, 그 외(`'pending'`/`'rejected'`/행 없음)에는 `InvitationExperience`를 렌더하지 않고 안내 화면(텍스트 `승인 대기 중인 청첩장입니다.` 또는 `존재하지 않는 청첩장입니다.`)만 렌더

- 입력 3 — 신청자가 `http://localhost:3002/apply` 3스텝을 채우고 마지막 스텝에서 저장 버튼 클릭
  - 처리: 슬러그 중복 검사 통과 후 `momozzang` 테이블에 신규 행 INSERT — `status='pending'`, `edit_password_hash`에 신청 폼에서 입력한 편집 비밀번호의 해시, `applicant_contact`에 연락처, `created_at` 자동
  - 출력: 완료 화면에 (a) 확정된 슬러그 문자열, (b) 편집 진입 경로 `/edit`, (c) `승인 후 공개됩니다` 취지의 안내 텍스트가 표시

- 입력 4 — 운영자가 `http://localhost:3002/admin`에 접속
  - 처리: Supabase Auth 세션이 없거나 로그인 이메일이 관리자 목록에 없으면 `/login`으로 리다이렉트. 세션이 유효하면 `momozzang` 행 목록을 `status` 필터(`pending`/`approved`/`rejected`/전체)와 함께 조회
  - 출력: 각 행의 슬러그·신청 연락처·`status`·`created_at`이 표 형태로 표시되고, 행마다 `승인`·`반려` 버튼이 존재. `승인` 클릭 시 해당 행 `status='approved'` + `approved_at`이 non-null로 갱신되고 목록이 갱신된 값으로 다시 그려짐

- 입력 5 — 신청자가 `http://localhost:3002/edit`에서 슬러그와 편집 비밀번호를 입력하고 진입 버튼 클릭
  - 처리: Postgres RPC가 `edit_password_hash`와 입력 비밀번호를 서버에서 대조
  - 출력: 불일치면 편집 폼 DOM을 렌더하지 않고 오류 텍스트 `슬러그 또는 비밀번호가 올바르지 않습니다.` 표시. 일치하면 해당 청첩장 데이터가 채워진 편집 폼을 렌더하고, 저장 시 같은 비밀번호를 함께 보내는 RPC로만 UPDATE 수행

**수용 기준:**

- [ ] `apps/momozzang-invitation/src/page/AppWrapper.tsx`의 `/` 라우트 element가 `OnboardingPage`이고, `http://localhost:5173/` 렌더 결과 DOM에 `InvitationExperience`가 만드는 노드가 0개다
- [ ] `http://localhost:5173/` DOM에 CTA 앵커가 1개 이상 있고, 그 `href` 문자열이 `import.meta.env.VITE_APPLY_URL` 값과 일치한다
- [ ] `status='pending'`인 슬러그로 `http://localhost:5173/{slug}` 접속 시 화면 텍스트에 `승인 대기 중인 청첩장입니다.`가 포함되고 청첩장 본문(신랑·신부 이름 노드)은 0개다
- [ ] `status='approved'`인 슬러그로 접속 시 기존과 동일하게 청첩장 본문이 렌더된다(회귀 없음)
- [ ] 로그인 세션이 없는 상태로 `http://localhost:3002/admin` 진입 시 브라우저 URL이 `/login`으로 바뀌고, 그 과정에서 `momozzang` 테이블을 향한 네트워크 요청이 0건이다
- [ ] 관리자 이메일이 아닌 계정으로 로그인하면 `/admin` 진입이 차단되고 `관리자 권한이 없습니다.` 텍스트가 표시된다
- [ ] `/admin`에서 `승인` 버튼 클릭 후 해당 슬러그 행을 재조회하면 `status='approved'`, `approved_at IS NOT NULL`이다
- [ ] `/admin`에서 `반려` 버튼 클릭 후 재조회하면 `status='rejected'`이고, 그 슬러그의 뷰어 접속은 `승인 대기 중인 청첩장입니다.`가 아닌 `공개되지 않은 청첩장입니다.` 텍스트를 표시한다
- [ ] `/apply` 완료 직후 해당 슬러그 행의 `status='pending'`, `edit_password_hash IS NOT NULL`, `edit_password_hash <> 입력한_평문_비밀번호`다
- [ ] `/edit`에서 틀린 비밀번호 입력 시 편집 폼 입력 필드가 0개이고 오류 텍스트가 표시된다. 맞는 비밀번호 입력 시 폼에 저장된 신랑 이름 값이 채워진다
- [ ] anon 키만 가진 클라이언트에서 `supabase.from('momozzang').update(...)`를 직접 호출하면 갱신 행 수가 0이거나 error가 반환된다(RLS 차단)
- [ ] anon 키만 가진 클라이언트에서 `supabase.from('momozzang').select('edit_password_hash')`를 호출하면 error가 반환되거나 값이 `null`이다(해시 비노출)
- [ ] `pnpm build:invitation`, `pnpm build:admin` 모두 exit code 0
- [ ] `pnpm --filter momozzang-invitation lint`, `pnpm --filter momozzang-admin lint` 모두 error 0건
- [ ] 신설 SQL 파일이 `apps/momozzang-invitation/supabase/` 아래에 존재하고, 컬럼 추가(`status`, `edit_password_hash`, `applicant_contact`, `approved_at`)와 RLS 정책 교체 DDL을 모두 포함한다

**범위 밖:**

- 결제/구독 기능
- 이메일·알림톡·SMS 발송(승인 알림은 화면 표시까지만)
- 신청자 회원가입/소셜 로그인(신청자는 계정 없이 슬러그+비밀번호로만 편집)
- 방명록(`guestbooks`) 스키마 및 동작 변경
- 이미지 업로드 파이프라인(Cloudflare Worker / R2 / `VITE_UPLOAD_TOKEN`) 구조 변경
- 청첩장 뷰어 본문 디자인 변경
- 다국어(i18n)
- 운영 Supabase 인스턴스에 대한 실제 DDL 실행(SQL 파일 작성·커밋까지만 하고 적용은 사람이 수행)

## 2. 개발디테일

**실행 방식:** 이 프롬프트는 `/harness` 스킬로 실행한다. 오케스트레이터는 실행 디렉토리를 `.harness/runs/business-flow-auth/`로 잡고, 아래 5개 스프린트를 순서대로 돌린다(스프린트 경계는 `harness-generator`가 `SPRINT_CONTRACT_<N>.md`로 확정하고 `harness-evaluator`가 `QA_FINDINGS_<N>.md`로 판정한다).

**건드릴 파일:**

*스프린트 1 — 데이터 계약 + 로컬 구현 + SQL*
- `packages/ui/src/entities/WeddingInvitation/model.ts` — `InvitationStatus`, `InvitationRecord`, `InvitationSummary` 타입 추가
- `packages/ui/src/entities/WeddingInvitation/repositories/types.ts` — `InvitationRepository`에 메서드 6개 추가, `CreateInvitationInput` 추가
- `packages/ui/src/entities/WeddingInvitation/repositories/LocalInvitationRepository.ts` — localStorage 레코드 래핑(`{ slug, status, editPasswordHash, data, applicantContact, createdAt, approvedAt }`)으로 신규 메서드 구현
- `packages/ui/src/shared/lib/hashPassword.ts` (신규) — Web Crypto `crypto.subtle.digest('SHA-256', …)` 기반 해시, **로컬 데이터소스 전용**
- `apps/momozzang-invitation/supabase/business_flow.sql` (신규) — 컬럼 추가 + `admin_users` 테이블 + RLS 정책 교체 + RPC 3종 DDL

*스프린트 2 — Supabase 구현*
- `packages/ui/src/entities/WeddingInvitation/repositories/SupabaseInvitationRepository.ts` — 신규 메서드를 RPC/테이블 호출로 구현
- `packages/ui/src/shared/lib/supabase.ts` — 세션 유지 옵션(`auth: { persistSession: true, autoRefreshToken: true }`) 명시

*스프린트 3 — 관리자 인증 + 승인 콘솔*
- `apps/momozzang-admin/src/features/auth/types.ts` (신규) — `AuthRepository`, `AdminSession`
- `apps/momozzang-admin/src/features/auth/SupabaseAuthRepository.ts` (신규)
- `apps/momozzang-admin/src/features/auth/LocalAuthRepository.ts` (신규) — `VITE_DATA_SOURCE !== 'supabase'`일 때 사용
- `apps/momozzang-admin/src/features/auth/authRepositoryFactory.ts` (신규)
- `apps/momozzang-admin/src/features/auth/useAdminSession.ts` (신규) — react-query로 세션 조회
- `apps/momozzang-admin/src/pages/LoginPage/LoginPage.tsx` (신규) + `.module.css`
- `apps/momozzang-admin/src/widgets/RequireAdmin/RequireAdmin.tsx` (신규) — 라우트 가드
- `apps/momozzang-admin/src/pages/ApprovalsPage/ApprovalsPage.tsx` (신규) + `.module.css` — 신청 목록/승인/반려
- `apps/momozzang-admin/src/features/invitation/api/useInvitationListQuery.ts` (신규), `useInvitationStatusMutation.ts` (신규)
- `apps/momozzang-admin/src/App.tsx` — 라우트 재구성

*스프린트 4 — 신청 플로우 전환*
- `apps/momozzang-admin/src/widgets/ApplyForm/ApplyForm.tsx` — 편집 비밀번호·연락처 입력 필드 추가
- `apps/momozzang-admin/src/features/apply/useApplyForm.ts` — `editPassword`, `applicantContact` 상태와 setter 추가
- `apps/momozzang-admin/src/features/apply/validateInvitation.ts` — 편집 비밀번호(8자 이상)·연락처 필수 검증 추가
- `apps/momozzang-admin/src/widgets/PublishStep/PublishStep.tsx` — 저장을 `updateInvitation` → `createInvitation`으로 전환, 완료 안내 문구 교체, 기존 "불러오기" UI 제거

*스프린트 5 — 편집 페이지 + 온보딩 + 뷰어 게이트*
- `apps/momozzang-admin/src/pages/EditPage/EditPage.tsx` (신규) + `.module.css` — 슬러그+비밀번호 게이트 후 `ApplyForm` 재사용
- `apps/momozzang-admin/src/features/apply/useEditGate.ts` (신규)
- `apps/momozzang-invitation/src/page/OnboardingPage.tsx` (신규) + `OnboardingPage.module.css` (신규)
- `apps/momozzang-invitation/src/page/AppWrapper.tsx` — `/` 라우트를 `OnboardingPage`로 교체
- `apps/momozzang-invitation/src/page/InvitationById.tsx` — `getInvitationRecord`로 전환, `status` 게이트 분기
- `apps/momozzang-invitation/src/page/Invitation.tsx` — 삭제(라우트에서 참조 제거 후)
- `.env.example` — `VITE_APPLY_URL`, `VITE_ADMIN_EMAILS`, `VITE_LOCAL_ADMIN_PASSWORD` 키 추가(값은 비움)
- `docs/admin-app.md`, `docs/data-model.md`, `docs/invitation-app.md`, `CLAUDE.md` — 라우트표·스키마·환경변수 갱신

**인터페이스/시그니처:**

```ts
// packages/ui/src/entities/WeddingInvitation/model.ts
export type InvitationStatus = 'pending' | 'approved' | 'rejected';

export interface InvitationRecord {
  slug: string;
  status: InvitationStatus;
  data: WeddingInvitation;
  applicantContact: string;
  createdAt: string;
  approvedAt: string | null;
}

export type InvitationSummary = Omit<InvitationRecord, 'data'>;
```

```ts
// packages/ui/src/entities/WeddingInvitation/repositories/types.ts
export interface CreateInvitationInput {
  slug: string;
  data: WeddingInvitation;
  editPassword: string;
  applicantContact: string;
}

export interface InvitationRepository {
  // 기존 2개 유지 (하위 호환)
  getInvitation(id: string): Promise<WeddingInvitation | null>;
  updateInvitation(id: string, data: WeddingInvitation): Promise<void>;

  // 신규 6개
  getInvitationRecord(slug: string): Promise<InvitationRecord | null>;
  createInvitation(input: CreateInvitationInput): Promise<void>;
  listInvitations(status?: InvitationStatus): Promise<InvitationSummary[]>;
  setInvitationStatus(slug: string, status: InvitationStatus): Promise<void>;
  getInvitationForEdit(slug: string, editPassword: string): Promise<WeddingInvitation | null>;
  updateInvitationWithPassword(
    slug: string,
    editPassword: string,
    data: WeddingInvitation,
  ): Promise<void>;
}
```

```ts
// apps/momozzang-admin/src/features/auth/types.ts
export interface AdminSession {
  email: string;
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<AdminSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AdminSession | null>;
  isAdmin(email: string): Promise<boolean>;
}

// authRepositoryFactory.ts — invitationRepositoryFactory 와 동일한 분기 규칙
export function getAuthRepository(): AuthRepository;
```

```sql
-- apps/momozzang-invitation/supabase/business_flow.sql (요지)
alter table public.momozzang
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists edit_password_hash text,
  add column if not exists applicant_contact text not null default '',
  add column if not exists approved_at timestamptz;

create table if not exists public.admin_users (email text primary key);

-- 기존 전체 공개 정책 제거
drop policy if exists "Allow public read access" on public.momozzang;
drop policy if exists "Allow public insert access" on public.momozzang;

-- anon: 승인된 행만, 해시 컬럼 제외한 컬럼만
revoke all on public.momozzang from anon;
grant select (id, slug, data, status, created_at, approved_at) on public.momozzang to anon;
create policy "anon reads approved" on public.momozzang
  for select to anon using (status = 'approved');

-- 관리자(로그인): 전체 조회/수정
create policy "admin reads all" on public.momozzang
  for select to authenticated
  using (auth.jwt() ->> 'email' in (select email from public.admin_users));
create policy "admin updates all" on public.momozzang
  for update to authenticated
  using (auth.jwt() ->> 'email' in (select email from public.admin_users));

-- 신청/편집은 SECURITY DEFINER RPC 로만
create or replace function public.create_invitation(
  p_slug text, p_data jsonb, p_edit_password text, p_applicant_contact text
) returns void language plpgsql security definer set search_path = public, extensions as $$ ... $$;

create or replace function public.get_invitation_for_edit(
  p_slug text, p_edit_password text
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$ ... $$;

create or replace function public.save_invitation_edit(
  p_slug text, p_data jsonb, p_edit_password text
) returns boolean language plpgsql security definer set search_path = public, extensions as $$ ... $$;

grant execute on function public.create_invitation, public.get_invitation_for_edit,
  public.save_invitation_edit to anon;
```

RPC 내부는 `extensions.crypt(p_edit_password, gen_salt('bf'))`로 해시를 만들고, 검증은 `edit_password_hash = extensions.crypt(p_edit_password, edit_password_hash)` 비교로 한다(pgcrypto 확장 필요). `save_invitation_edit`은 비밀번호 불일치 시 `false`를 반환하고 UPDATE를 실행하지 않는다.

**라우트 최종 형태:**

| 앱 | 경로 | 컴포넌트 | 접근 |
|----|------|----------|------|
| invitation | `/` | `OnboardingPage` (신규) | 공개 |
| invitation | `/:invitationId` | `InvitationById` (status 게이트) | `approved`만 본문 |
| admin | `/` | → `/admin` 리다이렉트 | — |
| admin | `/login` | `LoginPage` (신규) | 공개 |
| admin | `/admin` | `ApprovalsPage` (신규) | `RequireAdmin` |
| admin | `/admin/edit` | `AdminPage` (기존 이동) | `RequireAdmin` |
| admin | `/apply` | `ApplyPage` (기존) | 공개 |
| admin | `/edit` | `EditPage` (신규) | 슬러그+비밀번호 |

**구현 접근 (순서):**

1. **스프린트 1** — 타입/인터페이스를 먼저 확장하고 `LocalInvitationRepository`로 전 기능을 로컬에서 동작시킨다. SQL 파일도 이 스프린트에서 작성한다. 이 시점에 `pnpm build:*` 2개가 통과해야 한다.
2. **스프린트 2** — `SupabaseInvitationRepository`에 동일 메서드를 채운다. `getInvitationRecord`는 `select('slug, data, status, applicant_contact, created_at, approved_at')`로 조회하고 `edit_password_hash`는 절대 select 목록에 넣지 않는다. `createInvitation`/`getInvitationForEdit`/`updateInvitationWithPassword`는 `supabase.rpc(...)`만 사용한다.
3. **스프린트 3** — `LoginPage` + `RequireAdmin` + `ApprovalsPage`를 붙이고 `App.tsx` 라우트를 위 표대로 재구성한다. `RequireAdmin`은 세션 조회가 끝나기 전에는 목록 쿼리를 `enabled: false`로 막아, 미인증 상태에서 `momozzang` 요청이 나가지 않게 한다.
4. **스프린트 4** — `/apply`의 저장 경로를 `createInvitation`으로 바꾸고 편집 비밀번호·연락처 입력을 추가한다. `PublishStep`의 기존 "불러오기(loadSlug)" UI는 제거한다(무인증 조회 경로이므로).
5. **스프린트 5** — `/edit` 게이트, invitation 앱 `/` 온보딩, 뷰어 status 게이트를 붙이고 문서(`docs/*.md`, `CLAUDE.md`, `.env.example`)를 갱신한다.

**기존 코드 활용:**

- `apps/momozzang-admin/src/features/apply/useApplyForm.ts` — `/edit` 페이지는 이 훅과 `loadInvitation`을 그대로 재사용한다. 새 폼 상태 로직을 만들지 않는다.
- `apps/momozzang-admin/src/widgets/ApplyForm/ApplyForm.tsx`, `ImageStep`, `Stepper`, `PhonePreview` — `/edit`에서 동일 컴포넌트를 재사용한다.
- `apps/momozzang-admin/src/features/apply/validateSlug.ts` — 슬러그 형식 검증은 이 함수를 확장해 쓴다.
- `packages/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory.ts` — 팩토리 분기 패턴을 `authRepositoryFactory.ts`가 그대로 따른다.
- `apps/momozzang-admin/src/shared/ui/Panel`, `@momozzang/ui`의 `Button`/`Input` — 신규 화면(`LoginPage`/`ApprovalsPage`/`EditPage`)의 UI는 이 공유 컴포넌트로만 조립한다.
- `apps/momozzang-invitation/supabase/schema.sql` — 신규 SQL 파일의 작성 스타일(주석 번호 매김, `if not exists`)을 따른다.

## 3. 제약사항

**하지 말 것:**

- 운영 Supabase 인스턴스에 DDL/DML을 직접 실행하지 않는다. SQL은 `apps/momozzang-invitation/supabase/business_flow.sql`에 작성해 커밋만 하고, 적용은 사람이 한다. `supabase` CLI로 원격 프로젝트에 push하는 명령도 실행하지 않는다.
- 편집 비밀번호 평문 또는 `edit_password_hash`를 클라이언트 코드로 내려보내지 않는다. `SupabaseInvitationRepository`의 어떤 `.select()` 문자열에도 `edit_password_hash`를 넣지 않는다.
- 비밀번호 대조를 클라이언트에서 하지 않는다(Supabase 데이터소스 기준). 대조는 `get_invitation_for_edit` / `save_invitation_edit` RPC 안에서만 한다. 클라이언트 SHA-256 해시(`hashPassword.ts`)는 `VITE_DATA_SOURCE !== 'supabase'` 로컬 경로에서만 사용한다.
- 관리자 비밀번호·이메일·Supabase 키·업로드 토큰의 **값**을 코드·문서·커밋 메시지·SQL 파일에 적지 않는다(키 이름만 적는다).
- `.env` 파일을 커밋하지 않는다. `.env.example`에는 키 이름만 추가하고 값은 빈 문자열로 둔다.
- `guestbooks` 테이블과 `SupabaseGuestBookRepository`, 방명록 UI를 수정하지 않는다.
- 이미지 업로드 경로(`useImageUploadMutation`, `uploadToR2.ts`, `workers/upload`, `VITE_UPLOAD_TOKEN`)를 수정하지 않는다.
- 청첩장 뷰어 본문 위젯(`packages/ui/src/widgets/**`, `packages/ui/src/pages/WeddingInvitation`)의 마크업·스타일을 수정하지 않는다. status 게이트는 `InvitationById.tsx`에서만 분기한다.
- `InvitationRepository`의 기존 메서드 `getInvitation`/`updateInvitation`의 시그니처를 바꾸거나 삭제하지 않는다(기존 호출부 회귀 방지).
- 인증·승인 상태를 `localStorage`에 평문 플래그로 저장해 라우트 가드를 통과시키지 않는다(로컬 데이터소스의 `LocalAuthRepository`는 예외이며, 이 구현은 `VITE_DATA_SOURCE !== 'supabase'`에서만 로드되어야 한다).
- 기존 청첩장 행을 비공개로 만들지 않는다 — `business_flow.sql`은 컬럼 추가 직후 `update public.momozzang set status = 'approved', approved_at = created_at where status = 'pending' and created_at < <마이그레이션 기준시각>;` 형태의 백필 문을 포함해야 한다.

**지킬 규칙:**

- FSD 레이어 방향을 지킨다: `shared/` → `entities/` → `features/` → `widgets/` → `pages/`. 하위 레이어가 상위를 import하지 않는다.
- 데이터 접근은 반드시 Repository 팩토리(`getInvitationRepository()`, 신규 `getAuthRepository()`) 경유로만 한다. 페이지/위젯에서 `supabase` 클라이언트를 직접 import하지 않는다.
- 신규 화면 UI는 `@momozzang/ui`의 `Button`/`Input`과 admin `shared/ui/Panel`로 조립하고, 스타일은 CSS Modules(`*.module.css`) + 기존 디자인 토큰만 사용한다. 인라인 hex 색상값을 새로 쓰지 않는다.
- 서버 상태는 `@tanstack/react-query`(`useQuery`/`useMutation`)로만 다룬다. `useEffect` + `fetch` 조합을 새로 만들지 않는다.
- Prettier 설정을 따른다: `singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100`.
- 커밋 메시지는 기존 컨벤션(`feat(admin):`, `fix(invitation):` + 한글 요약)을 따르고, 스프린트마다 최소 1개 커밋을 남긴다.
- 사용자 노출 문자열은 한국어로 작성한다.
- 문서 갱신은 코드 변경과 같은 스프린트에서 한다(`docs/admin-app.md` 라우트표, `docs/data-model.md` 컬럼표, `docs/invitation-app.md` 라우트, `CLAUDE.md` 환경변수표).

**경계값:**

- 편집 비밀번호: 최소 8자, 최대 64자. 8자 미만 입력 시 `/apply` 저장을 차단하고 오류 메시지를 표시한다.
- 슬러그: 정규식 `^[a-z0-9-]{3,50}$`. 위반 시 저장 차단.
- 신청자 연락처(`applicant_contact`): 최소 1자, 최대 100자, 필수.
- `ApprovalsPage` 목록: 1회 조회당 최대 100행(`.limit(100)`), `created_at` 내림차순 정렬.
- `status` 허용값은 `'pending' | 'approved' | 'rejected'` 3개뿐이며, DB `check` 제약으로도 강제한다.
- 비밀번호 해시: Supabase 경로는 pgcrypto `gen_salt('bf')`(blowfish, 기본 cost) 사용.
- 라우트 가드 판정 지연: `RequireAdmin`은 세션 조회 완료 전까지 보호 라우트의 데이터 쿼리를 `enabled: false`로 유지한다(미인증 상태 데이터 요청 0건).

**의존성:** 신규 npm 의존성 추가 금지. 필요한 것은 이미 설치되어 있다 — `@supabase/supabase-js`(3개 패키지 모두), `react-router-dom` 7, `@tanstack/react-query` 5, `clsx`. 비밀번호 해싱 라이브러리(`bcryptjs` 등)를 새로 설치하지 않고, 서버는 pgcrypto, 로컬은 Web Crypto API를 쓴다. 신규 의존성이 꼭 필요하다고 판단되면 설치하지 말고 `PROGRESS.md`에 사유를 기록한 뒤 사용자에게 보고한다.

## 4. 테스트방법

**검증 명령 (매 스프린트 종료 시 전부 실행):**

```bash
# 저장소 루트에서
pnpm install

# 1) 타입 + 빌드 — 두 명령 모두 EXIT=0 이어야 한다
pnpm build:invitation; echo "BUILD_INVITATION_EXIT=$?"
pnpm build:admin;      echo "BUILD_ADMIN_EXIT=$?"

# 2) lint — 두 명령 모두 error 0건 (warning 은 허용)
pnpm --filter momozzang-invitation lint; echo "LINT_INVITATION_EXIT=$?"
pnpm --filter momozzang-admin lint;      echo "LINT_ADMIN_EXIT=$?"

# 3) 해시 비노출 정적 검증 — 클라이언트 소스에 edit_password_hash 문자열이 0건이어야 한다
grep -rn "edit_password_hash" packages/ui/src apps/momozzang-admin/src apps/momozzang-invitation/src; \
  echo "HASH_LEAK_GREP_EXIT=$? (1=검출없음=합격)"

# 4) supabase 직접 import 금지 검증 — 페이지/위젯 레이어에서 0건이어야 한다
grep -rn "shared/lib/supabase" apps/momozzang-admin/src/pages apps/momozzang-admin/src/widgets \
  apps/momozzang-invitation/src/page; echo "DIRECT_SUPABASE_GREP_EXIT=$? (1=검출없음=합격)"

# 5) SQL 파일 존재 및 필수 DDL 포함 검증 — 아래 5개 grep 이 모두 매치되어야 한다
test -f apps/momozzang-invitation/supabase/business_flow.sql; echo "SQL_FILE_EXIT=$?"
grep -c "add column if not exists status"            apps/momozzang-invitation/supabase/business_flow.sql
grep -c "add column if not exists edit_password_hash" apps/momozzang-invitation/supabase/business_flow.sql
grep -c "create table if not exists public.admin_users" apps/momozzang-invitation/supabase/business_flow.sql
grep -c "security definer"                            apps/momozzang-invitation/supabase/business_flow.sql
grep -c "set status = 'approved'"                     apps/momozzang-invitation/supabase/business_flow.sql
```

**E2E 검증 (dev 서버 + Playwright, `harness-evaluator` 수행):**

로컬 데이터소스(`VITE_DATA_SOURCE=local`)로 전 시나리오가 재현되어야 한다. Supabase 없이 검증 가능하도록 `LocalInvitationRepository` / `LocalAuthRepository`가 구현되어 있어야 한다.

```bash
pnpm dev:admin       # http://localhost:3002 (백그라운드)
pnpm dev:invitation  # http://localhost:5173 (백그라운드)
```

시나리오 S1 ~ S7 을 순서대로 조작하고 각 단언을 DOM 텍스트/URL로 확인한다.

| # | 조작 | 통과 기준 (관측 단언) |
|---|------|----------------------|
| S1 | `http://localhost:5173/` 접속 | 페이지에 서비스 소개 텍스트가 보이고, 신랑·신부 이름 노드가 0개. CTA 앵커의 `href`가 `VITE_APPLY_URL` 값과 일치 |
| S2 | 로그아웃 상태로 `http://localhost:3002/admin` 접속 | 브라우저 URL이 `/login`으로 바뀜. 네트워크 로그에 `momozzang` 조회 요청 0건 |
| S3 | `/apply`에서 슬러그 `qa-flow-001`, 편집 비밀번호 `qatest1234`, 연락처를 입력하고 마지막 스텝 저장 | 완료 화면에 `qa-flow-001` 문자열과 `/edit` 경로 안내가 표시됨 |
| S4 | `http://localhost:5173/qa-flow-001` 접속 | 텍스트 `승인 대기 중인 청첩장입니다.` 표시, 청첩장 본문 노드 0개 |
| S5 | `/login`에서 관리자 계정으로 로그인 → `/admin` | 목록에 `qa-flow-001` 행이 `pending`으로 보임. `승인` 클릭 후 같은 행이 `approved`로 다시 그려짐 |
| S6 | `http://localhost:5173/qa-flow-001` 재접속 | 청첩장 본문(신랑·신부 이름)이 렌더됨 |
| S7 | `/edit`에서 `qa-flow-001` + 틀린 비밀번호 `wrongpass1` → 이어서 올바른 비밀번호 | 틀린 경우 `슬러그 또는 비밀번호가 올바르지 않습니다.` 표시 + 폼 입력 필드 0개. 올바른 경우 폼에 S3에서 입력한 신랑 이름이 채워짐 |

**통과 기준 요약:** 위 5개 검증 명령이 모두 합격(빌드/lint EXIT=0, grep 3·4는 미검출, grep 5는 전부 1 이상) **그리고** S1~S7 단언이 전부 성립. 하나라도 실패하면 `QA_FINDINGS_<N>.md`에 재현 절차와 함께 기록하고 다음 스프린트에서 최우선 수정한다.

**엣지케이스:**

- [ ] `/apply`에서 이미 존재하는 슬러그로 저장 → 저장이 차단되고 `이미 사용 중인 슬러그입니다.` 표시, 기존 행의 `data`가 변경되지 않음
- [ ] `/apply`에서 편집 비밀번호 7자 입력 → 저장 차단 + 오류 메시지, 신규 행 0개 생성
- [ ] `/apply`에서 슬러그에 대문자·공백 포함(`QA Flow`) → 저장 차단
- [ ] `/edit`에서 존재하지 않는 슬러그 `no-such-slug` + 임의 비밀번호 → 존재 여부를 구분해 알려주지 않고 동일한 오류 텍스트(`슬러그 또는 비밀번호가 올바르지 않습니다.`) 표시
- [ ] `/admin`에서 `반려` 클릭한 슬러그를 뷰어로 접속 → `공개되지 않은 청첩장입니다.` 표시, 청첩장 본문 노드 0개
- [ ] 관리자 목록에 없는 이메일로 로그인 성공 후 `/admin` 진입 → `관리자 권한이 없습니다.` 표시, 목록 데이터 요청 0건
- [ ] 로그인 후 새로고침(F5) → `/admin`에 머무르고 `/login`으로 튕기지 않음(세션 유지)
- [ ] `/admin/edit`에서 기존 편집·갤러리 드래그 정렬·이미지 업로드가 이전과 동일하게 동작(회귀 없음)
- [ ] `status='approved'`인 기존 슬러그(마이그레이션 백필 대상)가 뷰어에서 그대로 열림
- [ ] `VITE_DATA_SOURCE=local`에서 S1~S7 전체가 Supabase 없이 통과

**수동 확인 (Supabase 적용 후 — 사람이 수행, 에이전트는 절차만 문서화):**

1. Supabase SQL Editor에서 `apps/momozzang-invitation/supabase/business_flow.sql`을 실행한다.
2. `insert into public.admin_users (email) values ('<운영자 이메일>');` 로 관리자 이메일을 등록한다(값은 저장소에 남기지 않는다).
3. Supabase Auth 대시보드에서 해당 이메일 계정을 생성한다.
4. `VITE_DATA_SOURCE=supabase`로 admin 앱을 띄우고 S2~S7을 다시 수행한다.
5. 브라우저 콘솔에서 anon 키 클라이언트로 아래를 실행해 차단을 확인한다.
   ```js
   // 기대: error 반환 또는 data 길이 0
   await supabase.from('momozzang').update({ data: {} }).eq('slug', 'qa-flow-001').select();
   // 기대: error 반환 (컬럼 권한 없음)
   await supabase.from('momozzang').select('edit_password_hash');
   // 기대: status='pending' 행이 조회되지 않음
   await supabase.from('momozzang').select('slug, status').eq('status', 'pending');
   ```
