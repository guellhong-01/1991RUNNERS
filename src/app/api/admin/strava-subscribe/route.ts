import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 운영진이 로그인한 상태로 이 주소에 브라우저로 접속하면 1회성으로 Strava 웹훅 구독을 등록합니다.
// 터미널이 없어도 URL 접속만으로 설정할 수 있게 만든 관리용 라우트입니다.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '운영진만 실행할 수 있습니다' }, { status: 403 })
  }

  const siteUrl = 'https://1991-runners.vercel.app'

  const res = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: `${siteUrl}/api/strava/webhook`,
      verify_token: process.env.STRAVA_VERIFY_TOKEN,
    }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
