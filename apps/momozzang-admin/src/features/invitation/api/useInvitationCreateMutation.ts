import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import type { CreateInvitationInput } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/types';

/**
 * `/apply` 신규 신청 생성(F3).
 *
 * 기존 `useInvitationMutation`(=`updateInvitation`)은 `/admin/edit` 의 저장 경로이므로
 * 수정·삭제하지 않고 별도 훅을 둔다. 이 훅은 항상 `createInvitation` 을 부르며,
 * Repository 가 중복 슬러그를 선검사해 예외를 던진다(기존 행 덮어쓰기 방지).
 *
 * 목록 캐시 무효화는 **접두사 매칭**이라 `['invitations','all']` 과 `['invitations','pending']` 을
 * 모두 무효화한다. 신청 직후 `/admin` 목록이 stale 로 남지 않는다.
 *
 * 평문 편집 비밀번호는 이 훅을 통과해 Repository 로만 흐르고, 로그에 남기지 않는다.
 */
export function useInvitationCreateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvitationInput) => {
      const repo = getInvitationRepository();
      await repo.createInvitation(input);
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invitation', input.slug] });
    },
  });
}
