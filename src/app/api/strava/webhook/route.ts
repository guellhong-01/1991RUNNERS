import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken } from '@/lib/strava'

// Strava가 웹훅 구독을 생성할 때 이 주소로 검증 요청(GET)을 보냅니다.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }
  return NextResponse.json({ error: 'invalid verify token' }, { status: 403 })
}

// 연결된 회원이 활동을 새로 올리거나 수정/삭제하면 Strava가 이 주소로 이벤트를 보냅니다.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const admin = createAdminClient()

  try {
    if (body.object_type === 'activity') {
      if (body.aspect_type === 'delete') {
        await admin.from('strava_activities').delete().eq('id', body.object_id)
      } else {
        const { data: connection } = await admin
          .from('strava_connections')
          .select('*')
          .eq('strava_athlete_id', body.owner_id)
          .single()

        if (connection) {
          const accessToken = await getValidAccessToken(admin, connection)
          const actRes = await fetch(`https://www.strava.com/api/v3/activities/${body.object_id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })

          if (actRes.ok) {
            const activity = await actRes.json()
            const isPublic = activity.visibility
              ? activity.visibility === 'everyone'
              : activity.private === false

            await admin.from('strava_activities').upsert({
              id: activity.id,
              user_id: connection.user_id,
              name: activity.name,
              type: activity.type,
              distance: activity.distance,
              moving_time: activity.moving_time,
              start_date: activity.start_date,
              average_speed: activity.average_speed,
              is_public: isPublic,
            })
          }
        }
      }
    }
  } catch (e) {
    console.error('Strava webhook error', e)
  }

  // Strava는 2초 안에 200 응답을 받지 못하면 재시도합니다. 실패해도 항상 200을 반환합니다.
  return NextResponse.json({ ok: true })
}
