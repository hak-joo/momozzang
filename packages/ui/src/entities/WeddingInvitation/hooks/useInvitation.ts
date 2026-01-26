import { useEffect, useState } from 'react';
import type { WeddingInvitation } from '../model';
import { getInvitationRepository } from '../repositories/invitationRepositoryFactory';

export function useInvitation(invitationId: string | undefined) {
  const [invitation, setInvitation] = useState<WeddingInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!invitationId) {
       setLoading(false);
       return;
    }

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        const repo = getInvitationRepository();
        const data = await repo.getInvitation(invitationId);
        setInvitation(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [invitationId]);

  return { invitation, loading, error };
}
