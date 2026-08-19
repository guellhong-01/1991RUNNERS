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
