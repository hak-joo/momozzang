import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { InvitationExperience } from './InvitationExperience';
import { fetchInvitationById } from '../services/invitations';

function InvitationByIdPage() {
  const { invitationId } = useParams();

  const invitationQuery = useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: () => fetchInvitationById(invitationId ?? ''),
    enabled: Boolean(invitationId),
    retry: false,
  });

  if (!invitationId) {
    return <Navigate to="/" replace />;
  }

  if (invitationQuery.isPending) {
    return <div>Loading invitation...</div>;
  }

  if (invitationQuery.isError || !invitationQuery.data) {
    return <Navigate to="/" replace />;
  }

  return <InvitationExperience metadata={invitationQuery.data} />;
}

export default InvitationByIdPage;
