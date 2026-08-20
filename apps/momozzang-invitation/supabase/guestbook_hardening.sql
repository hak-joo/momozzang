-- 방명록 보안 강화 (권한 · RLS · 비밀번호 해시 · 스팸 상한)
--
-- 전제: guestbook_schema.sql 과 business_flow.sql 이 이미 적용돼 있다.
-- 적용: 운영자가 Supabase SQL Editor 에서 이 파일 전체를 한 번 실행한다.
--       에이전트는 이 파일을 작성·커밋만 하고 원격 인스턴스에 실행하지 않는다.
-- 재실행: 모든 구문이 멱등하다(존재하면 교체/건너뜀). 여러 번 실행해도 안전하다.
--
-- ── 무엇을 고치나 ────────────────────────────────────────────────────────────
-- guestbook_schema.sql 의 초기 정책은 select/insert/delete 가 모두 `using (true)` 였다.
-- momozzang 테이블은 business_flow.sql 에서 컬럼 단위 권한 + RLS 로 조여졌지만
-- 방명록은 그대로 남아 다음 세 구멍이 있었다.
--
--   (1) `select('*')` 로 **비밀번호가 평문 그대로 모든 하객 브라우저에 내려갔다.**
--   (2) insert 가 무제한이라 스팸 한 번이면 Free 플랜 DB 500MB 와 egress 를 함께 갉아먹는다.
--   (3) delete 가 공개라 **비밀번호를 몰라도 남의 방명록을 지울 수 있었다.**
--       (앱이 하던 비밀번호 대조는 클라이언트 코드라 PostgREST 를 직접 호출하면 그냥 우회된다.)
--
-- 이 파일은 momozzang 이 쓰는 패턴(컬럼 단위 grant + security definer RPC)을 그대로 따른다.

-- 0. 비밀번호 해시에 쓰는 pgcrypto 확장 (business_flow.sql 과 동일 전제)
create extension if not exists pgcrypto with schema extensions;

-- ── 1. 조회/상한 검사용 인덱스 ───────────────────────────────────────────────
-- 뷰어의 목록 조회(`wedding_invitation_id` 필터 + `created_at desc` 정렬)와
-- 아래 3번 트리거의 청첩장별 건수 검사가 같은 인덱스를 쓴다.
-- FK 컬럼에는 인덱스가 자동 생성되지 않으므로 명시한다.
create index if not exists guestbooks_invitation_created_idx
  on public.guestbooks (wedding_invitation_id, created_at desc);

-- ── 2. 본문 크기 제한 ────────────────────────────────────────────────────────
-- 스팸 1건이 수 MB 를 차지해 DB 한도를 갉아먹지 못하게 막는다.
-- 기존 행이 제한을 넘을 수 있으므로 `not valid` 로 붙인다(신규/변경 행에만 적용).
alter table public.guestbooks
  drop constraint if exists guestbooks_writer_len,
  drop constraint if exists guestbooks_contents_len;

alter table public.guestbooks
  add constraint guestbooks_writer_len
    check (char_length(writer) between 1 and 20) not valid,
  add constraint guestbooks_contents_len
    check (char_length(contents) between 1 and 500) not valid;

-- ── 3. 비밀번호를 평문으로 저장하지 않는다 ──────────────────────────────────
-- 기존 평문을 bcrypt 해시로 1회 전환한다.
-- `$2` 로 시작하지 않는 값만 대상으로 삼아 재실행해도 이중 해시가 되지 않는다.
-- (방명록 비밀번호는 UI 상 4자리 숫자라 `$2` 로 시작하는 평문은 존재하지 않는다.)
update public.guestbooks
   set password = extensions.crypt(password, extensions.gen_salt('bf'))
 where password not like '$2%';

comment on column public.guestbooks.password is
  '방명록 삭제 비밀번호의 bcrypt 해시. 클라이언트로 절대 내려보내지 않는다(select 권한 없음).';

-- 삽입 시 서버에서 해시한다. 클라이언트는 지금처럼 평문을 보내지만 평문으로 저장되지 않는다.
-- 청첩장당 건수 상한도 여기서 함께 검사한다.
-- `security definer` 인 이유: 상한 검사의 count 가 호출자(anon)의 RLS 가시성에 좌우되면
-- 정책을 우회해 상한을 무력화할 여지가 생긴다. 항상 전체 행 기준으로 센다.
create or replace function public.hash_guestbook_password()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  if new.password is null or char_length(new.password) not between 1 and 20 then
    raise exception '비밀번호는 1~20자여야 합니다.' using errcode = '22023';
  end if;

  -- 청첩장 1건당 상한. 정상 하객 수를 한참 웃도는 값이라 사용성에는 영향이 없고,
  -- 자동화된 스팸이 무한히 쌓이는 것만 막는다.
  select count(*) into v_count
    from public.guestbooks g
   where g.wedding_invitation_id = new.wedding_invitation_id;

  if v_count >= 1000 then
    raise exception '이 청첩장의 방명록이 가득 찼습니다.' using errcode = '54000';
  end if;

  new.password := extensions.crypt(new.password, extensions.gen_salt('bf'));
  return new;
end;
$$;

drop trigger if exists guestbooks_hash_password on public.guestbooks;
create trigger guestbooks_hash_password
before insert on public.guestbooks
for each row execute function public.hash_guestbook_password();

-- ── 4. 컬럼 단위 권한 ────────────────────────────────────────────────────────
-- 테이블 전체 권한을 회수한 뒤 필요한 컬럼만 되돌려 준다.
-- `password` 는 어느 쪽에도 select 권한을 주지 않는다 → `select('*')` 를 해도 내려가지 않는다.
-- delete 권한도 주지 않는다 → 삭제는 아래 6번 RPC 로만 가능하다.
revoke all on public.guestbooks from anon, authenticated;

grant select (id, wedding_invitation_id, writer, contents, mini_me_id, created_at)
  on public.guestbooks to anon, authenticated;

grant insert (wedding_invitation_id, writer, contents, password, mini_me_id)
  on public.guestbooks to anon, authenticated;

-- ── 5. RLS 정책 교체 ─────────────────────────────────────────────────────────
alter table public.guestbooks enable row level security;

drop policy if exists "Allow public read access" on public.guestbooks;
drop policy if exists "Allow public insert access" on public.guestbooks;
drop policy if exists "Allow public delete access" on public.guestbooks;

-- 읽기/쓰기 모두 **공개(approved)된 청첩장**의 방명록으로 한정한다.
-- momozzang 의 `anon reads approved` 정책과 같은 기준이라, 비공개 청첩장의 방명록이
-- 슬러그 추측만으로 읽히거나 채워지지 않는다.
drop policy if exists "read guestbooks of approved invitations" on public.guestbooks;
create policy "read guestbooks of approved invitations"
on public.guestbooks
for select
to anon, authenticated
using (
  exists (
    select 1
      from public.momozzang m
     where m.slug = guestbooks.wedding_invitation_id
       and m.status = 'approved'
  )
);

drop policy if exists "write guestbooks of approved invitations" on public.guestbooks;
create policy "write guestbooks of approved invitations"
on public.guestbooks
for insert
to anon, authenticated
with check (
  exists (
    select 1
      from public.momozzang m
     where m.slug = guestbooks.wedding_invitation_id
       and m.status = 'approved'
  )
);

-- ── 6. 삭제 RPC ──────────────────────────────────────────────────────────────
-- 비밀번호 대조를 **서버 안에서만** 한다. 해시는 반환하지도, 비교를 위해 내보내지도 않는다.
-- 존재하지 않는 id 와 비밀번호 불일치를 구분해 알려주지 않는다(둘 다 false).
--   — momozzang 의 get_invitation_for_edit / save_invitation_edit 과 같은 규칙.
create or replace function public.delete_guestbook(
  p_id bigint,
  p_password text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deleted integer;
begin
  delete from public.guestbooks g
   where g.id = p_id
     and g.password = extensions.crypt(p_password, g.password);

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.delete_guestbook(bigint, text) from public;
grant execute on function public.delete_guestbook(bigint, text) to anon, authenticated;

-- ── 남은 위험 (의도적으로 열어 둔 것) ────────────────────────────────────────
-- 방명록 비밀번호는 UI 상 4자리 숫자다. 해시가 새지 않으므로 오프라인 대입은 불가능하지만,
-- delete_guestbook RPC 를 반복 호출하는 온라인 대입은 여전히 가능하다(최대 1만 회).
-- 이를 막으려면 호출 횟수 제한이 필요하며, 지금 범위 밖이다. 다만 강화 전에는 비밀번호
-- 없이도 삭제가 가능했으므로 이 변경만으로도 실질 위험은 크게 낮아진다.
