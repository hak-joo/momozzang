import { supabase } from '../../../shared/lib/supabase';
import type { WeddingInvitation } from '../model';
import type { InvitationRecord, InvitationStatus, InvitationSummary } from '../model';
import type { CreateInvitationInput } from './types';
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

  // 아래 6개는 스프린트 1 에서 인터페이스만 맞춘 **명시적 실패 스텁**이다.
  // 조용히 성공(null/빈 배열/no-op)하면 미구현이 "통과"로 오인되므로 반드시 throw 한다.
  // 스프린트 2 에서 RPC/테이블 호출로 전량 교체한다.
  async getInvitationRecord(_slug: string): Promise<InvitationRecord | null> {
    throw new Error('SupabaseInvitationRepository.getInvitationRecord 는 스프린트 2에서 구현됩니다.');
  }

  async createInvitation(_input: CreateInvitationInput): Promise<void> {
    throw new Error('SupabaseInvitationRepository.createInvitation 는 스프린트 2에서 구현됩니다.');
  }

  async listInvitations(_status?: InvitationStatus): Promise<InvitationSummary[]> {
    throw new Error('SupabaseInvitationRepository.listInvitations 는 스프린트 2에서 구현됩니다.');
  }

  async setInvitationStatus(_slug: string, _status: InvitationStatus): Promise<void> {
    throw new Error('SupabaseInvitationRepository.setInvitationStatus 는 스프린트 2에서 구현됩니다.');
  }

  async getInvitationForEdit(
    _slug: string,
    _editPassword: string,
  ): Promise<WeddingInvitation | null> {
    throw new Error('SupabaseInvitationRepository.getInvitationForEdit 는 스프린트 2에서 구현됩니다.');
  }

  async updateInvitationWithPassword(
    _slug: string,
    _editPassword: string,
    _data: WeddingInvitation,
  ): Promise<void> {
    throw new Error('SupabaseInvitationRepository.updateInvitationWithPassword 는 스프린트 2에서 구현됩니다.');
  }
}
