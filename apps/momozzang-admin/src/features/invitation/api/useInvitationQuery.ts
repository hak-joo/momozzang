import { useQuery } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import { WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';

export function useInvitationQuery(slug: string) {
  return useQuery<WeddingInvitation | null>({
    queryKey: ['invitation', slug],
    queryFn: async () => {
      if (!slug) return null;
      const repo = getInvitationRepository();
      const data = await repo.getInvitation(slug);
      return data;
    },
    enabled: !!slug,
  });
}
