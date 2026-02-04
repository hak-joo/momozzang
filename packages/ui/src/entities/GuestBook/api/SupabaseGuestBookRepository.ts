import { supabase } from '../../../shared/lib/supabase';
import type { GuestBookRepository } from './types';
import type { GuestBook, SaveGuestBookPayload, DeleteGuestBookPayload } from '../model/types';

export class SupabaseGuestBookRepository implements GuestBookRepository {
  async getGuestBooks({ invitationId, limit }: { invitationId: string; limit?: number }): Promise<GuestBook[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = supabase
      .from('guestbooks')
      .select('*')
      .eq('wedding_invitation_id', invitationId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('KB: Error fetching guestbooks', error);
      throw error;
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      writer: item.writer,
      contents: item.contents,
      date: item.created_at,
      miniMeId: item.mini_me_id,
      weddingInvitationId: item.wedding_invitation_id,
    }));
  }

  async saveGuestBook(payload: SaveGuestBookPayload): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('guestbooks')
      .insert([
        {
          wedding_invitation_id: payload.invitationId,
          writer: payload.nickname,
          contents: payload.message,
          password: payload.password,
          mini_me_id: payload.miniMeId,
        },
      ]);
      
    if (error) {
      console.error('KB: Error saving guestbook', error);
      throw error;
    }
  }

  async deleteGuestBook({ id, password }: DeleteGuestBookPayload): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Verify password
    const { data, error: fetchError } = await supabase
        .from('guestbooks')
        .select('password')
        .eq('id', id)
        .single();
    
    if (fetchError || !data) {
       throw new Error('삭제할 항목을 찾을 수 없습니다.');
    }

    if (String(data.password) !== String(password)) {
        throw new Error('비밀번호가 일치하지 않습니다.');
    }

    // 2. Delete
    const { error } = await supabase
      .from('guestbooks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
