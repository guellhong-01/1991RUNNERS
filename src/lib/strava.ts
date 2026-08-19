import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Strava 토큰 갱신 실패')
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number }>
}

export async function getValidAccessToken(
  admin: AdminClient,
  connection: { user_id: string; access_token: string; refresh_token: string; expires_at: number }
) {
  const now = Math.floor(Date.now() / 1000)
  if (connection.expires_at > now + 60) return connection.access_token

  const refreshed = await refreshAccessToken(connection.refresh_token)
  await admin
    .from('strava_connections')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  return refreshed.access_token
}

// 계정을 처음 연결할 때, 2026년 1월 1일 이후의 지난 활동 기록을 한 번에 불러옵니다.
// (그 이후 새 활동은 웹훅으로 자동 반영되지만, 연동 이전 기록은 웹훅이 못 잡아서 별도로 가져와야 합니다.)
export async function backfillActivities(admin: AdminClient, userId: string, accessToken: string) {
  const since = Math.floor(new Date('2026-01-01T00:00:00+09:00').getTime() / 1000)
  const perPage = 100
  let page = 1

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${since}&page=${page}&per_page=${perPage}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) break
    const activities = await res.json()
    if (!Array.isArray(activities) || activities.length === 0) break

    const rows = activities.map((activity: any) => ({
      id: activity.id,
      user_id: userId,
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      start_date: activity.start_date,
      average_speed: activity.average_speed,
      is_public: activity.visibility ? activity.visibility === 'everyone' : activity.private === false,
    }))

    if (rows.length > 0) {
      await admin.from('strava_activities').upsert(rows)
    }

    if (activities.length < perPage) break
    page += 1
  }
}
