import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import type { WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';

/**
 * 게이트 실패 문자열. 슬러그 미존재·비밀번호 불일치·해시 없는 레거시 행 **세 경우 모두** 이 문장 하나로 끝난다.
 * 문구가 갈리면 "그 슬러그는 존재한다"는 사실이 새어 나간다.
 */
export const EDIT_GATE_ERROR_MESSAGE = '슬러그 또는 비밀번호가 올바르지 않습니다.';

export interface EditGateInput {
  slug: string;
  editPassword: string;
}

export interface EditSaveInput extends EditGateInput {
  data: WeddingInvitation;
}

/**
 * `/edit` 진입 게이트.
 *
 * `useQuery` 가 아니라 `useMutation` 인 이유는 두 가지다.
 * ① 평문 비밀번호를 `queryKey` 에 넣지 않는다 — 쿼리 캐시에 남는다.
 * ② 진입은 사용자의 명시적 제출 행위라 mutation 이 의미상으로도 맞다.
 *
 * 페이지가 Repository 팩토리를 직접 부르지 않도록 이 훅이 유일한 데이터 접점이다.
 * 네트워크·서버 예외는 이 문자열로 덮지 않는다(자격증명 오류와 장애를 구분하지 못하면 운영이 불가능하다).
 */
export function useEditGateMutation() {
  return useMutation({
    mutationFn: async ({ slug, editPassword }: EditGateInput) => {
      const data = await getInvitationRepository().getInvitationForEdit(slug, editPassword);
      if (!data) {
        throw new Error(EDIT_GATE_ERROR_MESSAGE);
      }
      return data;
    },
  });
}

/**
 * `/edit` 저장.
 *
 * 반드시 비밀번호를 동반하는 `updateInvitationWithPassword` 로만 저장한다.
 * 무인증 `updateInvitation` 을 쓰면 슬러그만 알아도 남의 청첩장을 덮어쓸 수 있고,
 * 그 경로에는 레코드가 없을 때 `approved` 행을 새로 만드는 폴백까지 있어 유령 승인 행이 생긴다.
 */
export function useEditSaveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, editPassword, data }: EditSaveInput) =>
      getInvitationRepository().updateInvitationWithPassword(slug, editPassword, data),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ['invitation-record', slug] });
      queryClient.invalidateQueries({ queryKey: ['invitation', slug] });
    },
  });
}
