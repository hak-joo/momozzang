import type { WeddingInvitation } from '../model';
import { exampleWeddingInvitation } from '../data';
import type { InvitationRepository } from './types';

export class LocalInvitationRepository implements InvitationRepository {
  async getInvitation(id: string): Promise<WeddingInvitation | null> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return exampleWeddingInvitation;
  }

  async updateInvitation(id: string, data: WeddingInvitation): Promise<void> {
    
  }
}
