import { supabase } from '../../../shared/lib/supabase';
import type { WeddingInvitation } from '../model';
import type { InvitationRecord, InvitationStatus, InvitationSummary } from '../model';
import type { CreateInvitationInput } from './types';
import type { InvitationRepository } from './types';

/**
 * 슬러그 미존재와 비밀번호 불일치를 구분해 알려주지 않는다.
 * LocalInvitationRepository 와 **같은 문자열**이어야 두 데이터소스가 같은 화면 처리로 끝난다.
 */
const INVALID_CREDENTIALS_MESSAGE = '슬러그 또는 비밀번호가 올바르지 않습니다.';

/** anon 컬럼 grant 안에서만 조회하는 뷰어용 레코드 행. 편집 비밀번호 해시 컬럼은 포함하지 않는다. */
interface InvitationRecordRow {
  slug: string;
  data: WeddingInvitation;
  status: InvitationStatus;
  created_at: string;
  approved_at: string | null;
}

/** 관리자 목록용 요약 행. 본문(`data`)과 해시를 가져오지 않는다. */
interface InvitationSummaryRow {
  slug: string;
  status: InvitationStatus;
  applicant_contact: string | null;
  created_at: string;
  approved_at: string | null;
}

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

  /**
   * 뷰어(anon 세션)가 쓰는 단건 조회.
   * anon 컬럼 grant 에 `applicant_contact` 가 없으므로(business_flow.sql 5번) select 목록에 넣지 않는다.
   * 넣으면 테이블 전체가 permission denied 로 죽는다.
   * 0행은 "존재하지 않는 청첩장"이라는 정상 경로이므로 `.single()` 이 아니라 `.maybeSingle()` 을 쓴다.
   */
  async getInvitationRecord(slug: string): Promise<InvitationRecord | null> {
    const { data, error } = await supabase
      .from('momozzang')
      .select('slug, data, status, created_at, approved_at')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as InvitationRecordRow;

    return {
      slug: row.slug,
      status: row.status,
      data: row.data,
      // Supabase 경로에서는 항상 빈 문자열이다. 연락처가 필요하면 listInvitations(authenticated)를 쓴다.
      applicantContact: '',
      createdAt: row.created_at,
      approvedAt: row.approved_at ?? null,
    };
  }

  /**
   * 신청 저장. 평문 비밀번호는 RPC 안에서만 해시되며 클라이언트는 해시를 만들지도 받지도 않는다.
   * RPC 가 던지는 한국어 메시지(예: 이미 사용 중인 슬러그입니다.)를 그대로 보존해야 하므로
   * `throw error` 가 아니라 `throw new Error(error.message)` 다.
   */
  async createInvitation(input: CreateInvitationInput): Promise<void> {
    const { error } = await supabase.rpc('create_invitation', {
      p_slug: input.slug,
      p_data: input.data,
      p_edit_password: input.editPassword,
      p_applicant_contact: input.applicantContact,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /** 관리자 목록. 인증 세션 + RLS 전제이며 요약만 가져온다(본문 없음, 해시 없음). */
  async listInvitations(status?: InvitationStatus): Promise<InvitationSummary[]> {
    let query = supabase
      .from('momozzang')
      .select('slug, status, applicant_contact, created_at, approved_at');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as InvitationSummaryRow[]).map((row) => ({
      slug: row.slug,
      status: row.status,
      applicantContact: row.applicant_contact ?? '',
      createdAt: row.created_at,
      approvedAt: row.approved_at ?? null,
    }));
  }

  /** 승인/반려. approved 면 승인 시각을 남기고 그 외에는 null 로 되돌린다(로컬 구현과 동일 규칙). */
  async setInvitationStatus(slug: string, status: InvitationStatus): Promise<void> {
    const { error } = await supabase
      .from('momozzang')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('slug', slug);

    if (error) {
      throw new Error(error.message);
    }
  }

  /** 편집 진입. 비밀번호 대조는 RPC 안에서만 하며, 불일치와 미존재를 구분하지 않고 null 이다. */
  async getInvitationForEdit(
    slug: string,
    editPassword: string,
  ): Promise<WeddingInvitation | null> {
    const { data, error } = await supabase.rpc('get_invitation_for_edit', {
      p_slug: slug,
      p_edit_password: editPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data as WeddingInvitation | null) ?? null;
  }

  /** 편집 저장. RPC 가 false 를 돌려주면 갱신되지 않은 것이므로 저장 성공으로 취급하지 않는다. */
  async updateInvitationWithPassword(
    slug: string,
    editPassword: string,
    invitationData: WeddingInvitation,
  ): Promise<void> {
    const { data, error } = await supabase.rpc('save_invitation_edit', {
      p_slug: slug,
      p_data: invitationData,
      p_edit_password: editPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data !== true) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }
  }
}
