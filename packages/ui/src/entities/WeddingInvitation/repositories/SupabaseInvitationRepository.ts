import { supabase } from '../../../shared/lib/supabase';
import type { WeddingInvitation } from '../model';
import type { InvitationRepository } from './types';

export class SupabaseInvitationRepository implements InvitationRepository {
  async getInvitation(id: string): Promise<WeddingInvitation | null> {
    const { data, error } = await supabase
      .from('momozzang')
      .select('data')
      .eq('slug', id)
      .single();

    if (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }

    if (data && data.data) {
      return data.data as WeddingInvitation;
    }

    return null;
  }

  async updateInvitation(id: string, invitationData: WeddingInvitation): Promise<void> {
    const { error } = await supabase
      .from('momozzang')
      .update({ data: invitationData })
      .eq('slug', id);

    if (error) {
      throw error;
    }
  }
}
