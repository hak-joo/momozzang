import { useQuery } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import type { InvitationRecord } from '@momozzang/ui/src/entities/WeddingInvitation/model';

/**
 * 승인 전 내용 미리보기 전용 단건 조회(SPEC F3).
 *
 * `enabled` 에 **기본값을 주지 않는다.** 호출자가 반드시 명시하게 만들어, 목록이 붙는 순간
 * 행마다 본문을 당겨오는 "N건 일괄 조회"가 코드 경로 자체로 생기지 않게 한다.
 * 조회는 사용자가 그 행을 펼친 순간에만 일어난다.
 *
 * `retry: false` — 실패를 화면에 곧바로 드러내야 한다. 조용히 재시도하면 관리자는 로딩이
 * 끝나지 않는 것으로 읽고, 재시도 수단(`다시 시도`)의 존재 이유가 사라진다.
 *
 * 뷰어(`InvitationById`)가 쓰는 `['invitation-record', slug]` 와 키가 같지만 두 앱은 서로 다른
 * origin·서로 다른 QueryClient 라 캐시를 공유하지 않는다.
 */
export function useInvitationRecordQuery(slug: string | null, options: { enabled: boolean }) {
  return useQuery<InvitationRecord | null>({
    queryKey: ['invitation-record', slug],
    queryFn: async () => {
      if (!slug) return null;
      return getInvitationRepository().getInvitationRecord(slug);
    },
    enabled: options.enabled && Boolean(slug),
    retry: false,
  });
}
