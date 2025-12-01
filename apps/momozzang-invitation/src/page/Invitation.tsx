import { exampleWeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/data';
import { InvitationExperience } from './InvitationExperience';

function InvitationPage() {
  return <InvitationExperience metadata={exampleWeddingInvitation} />;
}

export default InvitationPage;
