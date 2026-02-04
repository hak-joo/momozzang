-- 기존 guestbooks 테이블에 Foreign Key 제약조건 추가
-- 주의: guestbooks 테이블에 이미 momozzang에 없는 slug를 가진 데이터가 있다면 이 쿼리는 실패할 수 있습니다.
-- 그럴 경우, 잘못된 데이터를 먼저 정리해야 합니다.

ALTER TABLE public.guestbooks
ADD CONSTRAINT fk_wedding_invitation
FOREIGN KEY (wedding_invitation_id)
REFERENCES public.momozzang (slug)
ON DELETE CASCADE;
