import type { WeddingInvitation } from '../model';

export interface InvitationRepository {
  getInvitation(id: string): Promise<WeddingInvitation | null>;
  updateInvitation(id: string, data: WeddingInvitation): Promise<void>;
}
