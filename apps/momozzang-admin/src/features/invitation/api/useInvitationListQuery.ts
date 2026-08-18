import { useQuery } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import type {
  InvitationStatus,
  InvitationSummary,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';

/**
 * 신청 목록 조회.
 *
 * `enabled` 에 **기본값을 주지 않는다.** 호출자가 반드시 명시하게 만들어
 * "깜빡하고 항상 켜짐" 을 타입 수준에서 막는다 — 관리자 판정이 끝나기 전에
 * 목록 요청이 새어 나가는 사고를 방지하는 두 번째 방어선이다.
 *
 * 상한 100행·`created_at` 내림차순은 Repository 쪽 책임이다. 훅에서 다시 자르지 않는다.
 */
export function useInvitationListQuery(
  status: InvitationStatus | undefined,
  options: { enabled: boolean },
) {
  return useQuery<InvitationSummary[]>({
    queryKey: ['invitations', status ?? 'all'],
    queryFn: async () => {
      const repo = getInvitationRepository();
      return repo.listInvitations(status);
    },
    enabled: options.enabled,
  });
}
