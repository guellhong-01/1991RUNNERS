import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 서버 전용 관리자 클라이언트입니다. RLS를 우회하므로 절대 클라이언트(브라우저)에서 import하지 마세요.
// Strava 웹훅, OAuth 콜백처럼 로그인 세션 없이 DB에 써야 하는 서버 라우트에서만 사용합니다.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
