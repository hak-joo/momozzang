-- 비즈니스 플로우 마이그레이션 (신청 → 승인 → 편집 → 하객 공개)
--
-- 전제: schema.sql 이 이미 적용돼 public.momozzang 이 존재한다.
-- 적용: 운영자가 Supabase SQL Editor 에서 이 파일 전체를 한 번 실행한다.
--       에이전트는 이 파일을 작성·커밋만 하고 원격 인스턴스에 실행하지 않는다.
-- 실행 후: `insert into public.admin_users (email) values ('<운영자 이메일>');` 로
--         관리자 이메일을 등록한다. 이메일 값은 이 저장소에 남기지 않는다.

-- 0. 비밀번호 해시에 쓰는 pgcrypto 확장
create extension if not exists pgcrypto with schema extensions;

-- 1. 수명주기 컬럼 추가
alter table public.momozzang
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists edit_password_hash text,
  add column if not exists applicant_contact text not null default '',
  add column if not exists approved_at timestamptz;

comment on column public.momozzang.status is '신청 수명주기: pending | approved | rejected';
comment on column public.momozzang.edit_password_hash is '편집 비밀번호 해시(pgcrypto bf). 클라이언트로 내보내지 않는다.';
comment on column public.momozzang.applicant_contact is '신청자 연락처';
comment on column public.momozzang.approved_at is '승인 시각. 승인 취소/반려 시 null 로 되돌린다.';

-- 2. 기존 행 백필
--    status 기본값이 pending 이라 마이그레이션 직후 기존 공개 청첩장이 전부 비공개가 된다.
--    마이그레이션 기준시각 이전에 만들어진 행은 이미 공개돼 있던 것이므로 approved 로 되돌린다.
update public.momozzang
   set status = 'approved',
       approved_at = created_at
 where status = 'pending'
   and created_at < '2026-08-18T00:00:00+00:00'::timestamptz;

-- 3. 관리자 이메일 화이트리스트
create table if not exists public.admin_users (
  email text primary key
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;

drop policy if exists "admin reads own row" on public.admin_users;
create policy "admin reads own row"
on public.admin_users
for select
to authenticated
using (auth.jwt() ->> 'email' = email);

-- 4. schema.sql 의 전체 공개 정책 제거 (슬러그만 알면 누구나 읽고 쓰던 경로를 닫는다)
drop policy if exists "Allow public read access" on public.momozzang;
drop policy if exists "Allow public insert access" on public.momozzang;

-- 5. anon: 승인된 행만, 해시 컬럼을 제외한 컬럼만 조회 가능
revoke all on public.momozzang from anon;
grant select (id, slug, data, status, created_at, approved_at) on public.momozzang to anon;

drop policy if exists "anon reads approved" on public.momozzang;
create policy "anon reads approved"
on public.momozzang
for select
to anon
using (status = 'approved');

-- 6. 관리자(로그인 사용자): 전체 조회 / 승인·반려 갱신
grant select, update on public.momozzang to authenticated;

drop policy if exists "admin reads all" on public.momozzang;
create policy "admin reads all"
on public.momozzang
for select
to authenticated
using (auth.jwt() ->> 'email' in (select email from public.admin_users));

drop policy if exists "admin updates all" on public.momozzang;
create policy "admin updates all"
on public.momozzang
for update
to authenticated
using (auth.jwt() ->> 'email' in (select email from public.admin_users))
with check (auth.jwt() ->> 'email' in (select email from public.admin_users));

-- 7. 신청 저장 RPC — anon 이 테이블에 직접 insert 하지 못하게 하고 이 함수로만 받는다.
create or replace function public.create_invitation(
  p_slug text,
  p_data jsonb,
  p_edit_password text,
  p_applicant_contact text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_slug !~ '^[a-z0-9-]{3,50}$' then
    raise exception '슬러그 형식이 올바르지 않습니다.';
  end if;

  if p_edit_password is null or length(p_edit_password) < 8 or length(p_edit_password) > 64 then
    raise exception '편집 비밀번호는 8자 이상 64자 이하여야 합니다.';
  end if;

  if p_applicant_contact is null
     or length(p_applicant_contact) < 1
     or length(p_applicant_contact) > 100 then
    raise exception '연락처를 입력해 주세요.';
  end if;

  if exists (select 1 from public.momozzang m where m.slug = p_slug) then
    raise exception '이미 사용 중인 슬러그입니다.';
  end if;

  insert into public.momozzang (slug, data, status, edit_password_hash, applicant_contact)
  values (
    p_slug,
    p_data,
    'pending',
    extensions.crypt(p_edit_password, extensions.gen_salt('bf')),
    p_applicant_contact
  );
end;
$$;

-- 8. 편집 진입 RPC — 비밀번호 대조를 서버에서만 하고 해시는 반환하지 않는다.
create or replace function public.get_invitation_for_edit(
  p_slug text,
  p_edit_password text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_data jsonb;
begin
  select m.data
    into v_data
    from public.momozzang m
   where m.slug = p_slug
     and m.edit_password_hash is not null
     and m.edit_password_hash = extensions.crypt(p_edit_password, m.edit_password_hash);

  -- 슬러그 미존재와 비밀번호 불일치를 구분해 알려주지 않는다(둘 다 null).
  return v_data;
end;
$$;

-- 9. 편집 저장 RPC — 비밀번호가 틀리면 false 를 반환하고 갱신하지 않는다.
create or replace function public.save_invitation_edit(
  p_slug text,
  p_data jsonb,
  p_edit_password text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated integer;
begin
  update public.momozzang m
     set data = p_data
   where m.slug = p_slug
     and m.edit_password_hash is not null
     and m.edit_password_hash = extensions.crypt(p_edit_password, m.edit_password_hash);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- 10. RPC 실행 권한 — 신청/편집은 계정 없이 수행하므로 anon 에도 열어 준다.
revoke all on function public.create_invitation(text, jsonb, text, text) from public;
revoke all on function public.get_invitation_for_edit(text, text) from public;
revoke all on function public.save_invitation_edit(text, jsonb, text) from public;

grant execute on function public.create_invitation(text, jsonb, text, text) to anon, authenticated;
grant execute on function public.get_invitation_for_edit(text, text) to anon, authenticated;
grant execute on function public.save_invitation_edit(text, jsonb, text) to anon, authenticated;
