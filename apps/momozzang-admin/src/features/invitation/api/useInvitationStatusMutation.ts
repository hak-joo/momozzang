import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import type { InvitationStatus } from '@momozzang/ui/src/entities/WeddingInvitation/model';

interface SetInvitationStatusParams {
  slug: string;
  status: InvitationStatus;
}

/**
 * 승인·반려 상태 변경.
 *
 * `invalidateQueries({ queryKey: ['invitations'] })` 는 **접두사 매칭**이라
 * `['invitations','all']` 과 `['invitations','pending']` 을 모두 무효화한다.
 * 필터가 걸린 상태에서 승인해도 목록이 갱신된다.
 *
 * `approvedAt` 은 Repository 가 채운다(`approved` 면 현재 시각, 그 외면 `null`).
 * 훅은 시각을 만들지 않는다.
 */
export function useInvitationStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, status }: SetInvitationStatusParams) => {
      const repo = getInvitationRepository();
      await repo.setInvitationStatus(slug, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
