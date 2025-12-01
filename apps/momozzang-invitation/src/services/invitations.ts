import type { WeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/model';

export async function fetchInvitationById(invitationId: string): Promise<WeddingInvitation> {
  if (!invitationId) {
    throw new Error('Invitation id is required');
  }

  const requestUrl = `/api/invitation/${invitationId}`;

  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`Invitation fetch failed with status ${response.status}`);
  }

  return (await response.json()) as WeddingInvitation;
}
