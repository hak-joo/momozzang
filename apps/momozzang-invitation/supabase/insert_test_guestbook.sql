-- 방명록은 별도의 테이블(guestbooks)로 관리되므로,
-- "빈 배열"을 넣기 위해 별도의 쿼리를 실행할 필요가 없습니다.
-- (데이터가 없으면 조회 시 자동으로 빈 배열 []이 반환됩니다.)

-- 만약 테스트를 위해 "임의의 데이터 1개"를 넣고 싶다면 아래 쿼리를 사용하세요.

INSERT INTO public.guestbooks (
  wedding_invitation_id,
  writer,
  contents,
  password,
  mini_me_id
) VALUES (
  'hakjoo-minjeong', -- 연결할 초대장 Slug
  '테스트 봇',
  '축하합니다! (테스트 메시지)',
  '1234',
  1
);
