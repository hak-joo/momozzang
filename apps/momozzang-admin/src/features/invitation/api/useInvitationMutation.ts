import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import { WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';

interface UpdateInvitationParams {
  slug: string;
  data: WeddingInvitation;
}

export function useInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, data }: UpdateInvitationParams) => {
      const repo = getInvitationRepository();
      await repo.updateInvitation(slug, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitation', variables.slug] });
    },
  });
}
