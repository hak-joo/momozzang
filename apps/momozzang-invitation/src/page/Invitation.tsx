import { useInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/hooks/useInvitation';
import { InvitationExperience } from './InvitationExperience';

function InvitationPage() {
  // TODO: Get ID from URL params if needed. For now using default which maps to 'demo-captain-luna' or similar in logic
  const { invitation, loading, error } = useInvitation('demo-captain-luna');

  if (loading) {
    return <div>Loading...</div>; // TODO: Better loading state
  }

  if (error || !invitation) {
    return <div>Error loading invitation</div>; // TODO: Better error state
  }

  return <InvitationExperience metadata={invitation} />;
}

export default InvitationPage;
