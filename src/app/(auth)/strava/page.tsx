'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Map, ChevronLeft, ChevronRight } from 'lucide-react'
import StravaMapModal from './StravaMapModal'

// "최근 활동" 피드는 지금은 화면에서 숨겨둔 상태입니다.
// 나중에 다시 보여주고 싶으면 이 값을 true로 바꾸면 됩니다 (관련 코드는 그대로 남겨뒀어요).
const SHOW_RECENT_ACTIVITIES = false

const TYPE_LABELS: Record<string, string> = {
  Run: '러닝', TrailRun: '트레일런', Ride: '자전거', Walk: '걷기', Hike: '하이킹',
}

const ERROR_MESSAGES: Record<string, string> = {
  denied: 'Strava 연동이 취소됐어요. 권한 허용 화면에서 Authorize를 눌러야 연동돼요.',
  token: 'Strava와 연결하는 중 오류가 났어요. Client ID/Secret 환경변수를 확인해주세요.',
  save: '연동 정보를 저장하는 중 오류가 났어요. Vercel 로그에서 자세한 원인을 확인해주세요.',
}

interface ActivityRow {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
  is_public: boolean
  profile?: { name: string; avatar_url?: string }
}

interface MonthlyRow {
  user_id: string
  name: string
  avatar_url?: string
  km: number
}

function StravaPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [userId, setUserId] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<ActivityRow | null>(null)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: myConnection } = await supabase
      .from('strava_connections').select('user_id').eq('user_id', user.id).maybeSingle()
    setConnected(!!myConnection)

    const { data: feed } = await supabase
      .from('strava_activities')
      .select('id, name, type, distance, moving_time, start_date, is_public, profile:profiles(name, avatar_url)')
      .order('start_date', { ascending: false })
      .limit(50)
    setActivities((feed as any) || [])

    setLoading(false)
  }

  const loadMonthly = async (cursor: Date) => {
    setMonthLoading(true)
    const monthStart = cursor.toISOString()
    const monthEnd = addMonths(cursor, 1).toISOString()

    const { data: monthActs } = await supabase
      .from('strava_activities')
      .select('user_id, distance, profile:profiles(name, avatar_url)')
      .eq('type', 'Run')
      .gte('start_date', monthStart)
      .lt('start_date', monthEnd)

    const totals: Record<string, MonthlyRow> = {}
    ;(monthActs as any[] || []).forEach((a) => {
      if (!totals[a.user_id]) {
        totals[a.user_id] = { user_id: a.user_id, name: a.profile?.name || '알 수 없음', avatar_url: a.profile?.avatar_url, km: 0 }
      }
      totals[a.user_id].km += a.distance / 1000
    })
    setMonthly(Object.values(totals).sort((a, b) => b.km - a.km))
    setMonthLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadMonthly(monthCursor) }, [monthCursor])

  const handleDisconnect = async () => {
    if (!confirm('Strava 연동을 해제할까요? 이미 동기화된 활동 기록은 남아있어요.')) return
    await supabase.from('strava_connections').delete().eq('user_id', userId)
    setConnected(false)
  }

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const connectUrl = typeof window !== 'undefined'
    ? `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${window.location.origin}/auth/strava/callback&approval_prompt=auto&scope=activity:read`
    : '#'

  const Avatar = ({ name, url }: { name: string; url?: string }) => (
    <div className="w-8 h-8 rounded-full bg-[#c0392b] flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
      {url ? <img src={url} className="w-full h-full object-cover" alt={name} /> : name[0]}
    </div>
  )

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">불러오는 중...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">스트라바 활동</h1>
        <p className="text-gray-500 mt-1">회원들의 러닝 마일리지를 월별로 확인하세요</p>
      </div>

      {errorParam && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
          {ERROR_MESSAGES[errorParam] || `연동 중 오류가 발생했어요 (${errorParam})`}
        </div>
      )}

      {!connected ? (
        <div className="card flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium text-gray-900">스트라바 계정을 연결해보세요</p>
            <p className="text-sm text-gray-500 mt-1">연결하면 내 러닝 활동이 자동으로 동기화돼요</p>
          </div>
          <a href={connectUrl} className="shrink-0 px-4 py-2 bg-[#FC4C02] text-white text-sm font-medium rounded-lg hover:opacity-90">
            Strava 연동하기
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-green-600 font-medium">✓ Strava 연동됨</span>
          <button onClick={handleDisconnect} className="text-xs text-gray-400 hover:text-gray-600">연동 해제</button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">러닝 마일리지</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonthCursor(subMonths(monthCursor, 1))} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" aria-label="이전 달">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-gray-700 w-24 text-center">
              {format(monthCursor, 'yyyy년 M월', { locale: ko })}
            </span>
            <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" aria-label="다음 달">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {monthLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>
        ) : monthly.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{format(monthCursor, 'M월', { locale: ko })} 기록이 아직 없어요</p>
        ) : (
          <div className="space-y-1">
            {monthly.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="w-5 text-center font-bold text-gray-400 text-sm">{i + 1}</span>
                <Avatar name={m.name} url={m.avatar_url} />
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{m.name}</span>
                <span className="text-sm font-bold text-[#c0392b]">{m.km.toFixed(1)} km</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {SHOW_RECENT_ACTIVITIES && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">최근 활동</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">아직 동기화된 활동이 없어요</p>
          ) : (
            <div className="space-y-1">
              {activities.map((a) => (
                <div
                  key={a.id}
                  onClick={() => a.is_public && setSelectedActivity(a)}
                  className={`flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 ${a.is_public ? 'cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1' : ''}`}
                >
                  <Avatar name={a.profile?.name || '?'} url={a.profile?.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                      {a.profile?.name} · {a.name}
                      {a.is_public && <Map size={12} className="text-[#FC4C02] shrink-0" />}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(a.start_date), 'M월 d일 HH:mm', { locale: ko })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{(a.distance / 1000).toFixed(1)} km</p>
                    <p className="text-xs text-gray-400">{TYPE_LABELS[a.type] || a.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedActivity && (
        <StravaMapModal
          activityId={selectedActivity.id}
          title={`${selectedActivity.profile?.name} · ${selectedActivity.name}`}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  )
}

export default function StravaPage() {
  return (
    <Suspense>
      <StravaPageInner />
    </Suspense>
  )
}
