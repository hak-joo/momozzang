import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseEnabled = import.meta.env.VITE_DATA_SOURCE === 'supabase';

// 환경변수가 없어도 import 만으로 앱이 죽지 않도록 placeholder 로 폴백한다.
// 실제 사용 여부는 VITE_DATA_SOURCE 분기(invitationRepositoryFactory)가 가른다.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder';

const useRemote = isSupabaseEnabled && Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = createClient(
  useRemote ? supabaseUrl : PLACEHOLDER_URL,
  useRemote ? supabaseAnonKey : PLACEHOLDER_KEY,
  {
    // 관리자 로그인 후 새로고침해도 /admin 에 머무르려면 세션 영속과 자동 갱신이 필요하다.
    auth: { persistSession: true, autoRefreshToken: true },
  },
);
