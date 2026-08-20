import { supabase } from '../../../shared/lib/supabase';
import type { GuestBookRepository } from './types';
import type { GuestBook, SaveGuestBookPayload, DeleteGuestBookPayload } from '../model/types';

/**
 * 조회 컬럼 목록.
 *
 * `*` 를 쓰지 않는 이유: `password` 컬럼에는 anon/authenticated 의 select 권한이 없다
 * (`supabase/guestbook_hardening.sql`). PostgREST 의 `select=*` 는 전체 컬럼 SELECT 로
 * 번역되므로 권한 오류가 난다. 필요한 컬럼만 명시하는 게 정답이자 유일한 동작 방식이다.
 */
const LIST_COLUMNS = 'id, wedding_invitation_id, writer, contents, mini_me_id, created_at';

interface GuestBookRow {
  id: number;
  wedding_invitation_id: string;
  writer: string;
  contents: string;
  mini_me_id: number;
  created_at: string;
}

export class SupabaseGuestBookRepository implements GuestBookRepository {
  async getGuestBooks({
    invitationId,
    limit,
  }: {
    invitationId: string;
    limit?: number;
  }): Promise<GuestBook[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = supabase
      .from('guestbooks')
      .select(LIST_COLUMNS)
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

    return ((data ?? []) as GuestBookRow[]).map((item) => ({
      id: item.id,
      writer: item.writer,
      contents: item.contents,
      date: item.created_at,
      miniMeId: item.mini_me_id,
      weddingInvitationId: item.wedding_invitation_id,
    }));
  }

  /**
   * 비밀번호는 평문으로 보내지만 평문으로 저장되지 않는다.
   * `guestbooks_hash_password` BEFORE INSERT 트리거가 서버에서 bcrypt 해시로 바꿔 저장한다.
   */
  async saveGuestBook(payload: SaveGuestBookPayload): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase.from('guestbooks').insert([
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

  /**
   * 삭제는 `delete_guestbook` RPC 로만 한다.
   *
   * 이전에는 비밀번호를 클라이언트로 내려받아 브라우저에서 대조했는데, 그건 (a) 비밀번호가
   * 노출되고 (b) PostgREST 를 직접 호출하면 대조 자체를 건너뛸 수 있어 실질 보호가 없었다.
   * 지금은 테이블 delete 권한이 회수돼 있고, 대조는 RPC 안(서버)에서만 일어난다.
   *
   * RPC 는 "없는 id" 와 "비밀번호 불일치" 를 구분해 주지 않는다(둘 다 false). 존재 여부를
   * 흘리지 않기 위한 의도된 설계이므로, 클라이언트도 하나의 메시지로만 안내한다.
   */
  async deleteGuestBook({ id, password }: DeleteGuestBookPayload): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.rpc('delete_guestbook', {
      p_id: id,
      p_password: password,
    });

    if (error) {
      console.error('KB: Error deleting guestbook', error);
      throw error;
    }

    if (data !== true) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
  }
}
