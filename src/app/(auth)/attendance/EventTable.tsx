'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  run: '정기런', ddayrun: '뛰꼬양데이', event: '행사', race: '대회',
}
const TYPE_COLORS: Record<string, string> = {
  run: 'bg-blue-100 text-blue-700', ddayrun: 'bg-purple-100 text-purple-700',
  event: 'bg-green-100 text-green-700', race: 'bg-red-100 text-red-700',
}
const PAGE_SIZE = 20

interface Profile { id: string; name: string; avatar_url?: string }
interface Event { id: string; title: string; event_date: string; event_type: string }

const Avatar = ({ profile }: { profile: Profile }) => (
  <div className="w-6 h-6 rounded-full bg-[#c0392b] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
    {profile.avatar_url
      ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.name} />
      : profile.name[0]}
  </div>
)

export default function EventTable({ profiles, events, attendanceMap, isAdmin }: {
  profiles: Profile[]
  events: Event[]
  attendanceMap: Record<string, string[]>
  isAdmin?: boolean
}) {
  const supabase = createClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [localMap, setLocalMap] = useState<Record<string, string[]>>(attendanceMap)
  const [confirm, setConfirm] = useState<{ userId: string; eventId: string; name: string; title: string; attended: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [modalSearch, setModalSearch] = useState('')

  const getCount = (userId: string) => localMap[userId]?.length ?? 0
  const filtered = profiles.filter(p => p.name?.includes(search))
  const sorted = [...filtered].sort((a, b) => getCount(b.id) - getCount(a.id))
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const attendedList = selectedEvent
    ? profiles.filter(p => (localMap[p.id] ?? []).includes(selectedEvent.id) && p.name?.includes(modalSearch))
    : []
  const notAttendedList = selectedEvent
    ? profiles.filter(p => !(localMap[p.id] ?? []).includes(selectedEvent.id) && p.name?.includes(modalSearch))
    : []

  const openEventModal = (event: Event) => {
    setModalSearch('')
    setSelectedEvent(event)
  }

  const handleCellClick = (profile: Profile, event: Event) => {
    if (!isAdmin) return
    const attended = (localMap[profile.id] ?? []).includes(event.id)
    setConfirm({ userId: profile.id, eventId: event.id, name: profile.name, title: event.title, attended })
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setLoading(true)
    const { userId, eventId, attended } = confirm
    if (attended) {
      await supabase.from('attendances')
        .update({ status: 'not_attending', checked_in: false, checked_in_at: null })
        .eq('user_id', userId).eq('event_id', eventId)
      setLocalMap(prev => ({ ...prev, [userId]: (prev[userId] ?? []).filter(id => id !== eventId) }))
    } else {
      await supabase.from('attendances').upsert({
        user_id: userId, event_id: eventId, status: 'attending', checked_in: true, checked_in_at: new Date().toISOString(),
      }, { onConflict: 'user_id,event_id' })
      setLocalMap(prev => ({ ...prev, [userId]: [...(prev[userId] ?? []), eventId] }))
    }
    setLoading(false)
    setConfirm(null)
  }

  return (
    <div>
      {/* 확인 팝업 */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <p className="text-gray-900 font-medium mb-1">출석 {confirm.attended ? '취소' : '추가'}</p>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-800">{confirm.name}</span>님의{' '}
              <span className="font-medium text-gray-800">{confirm.title}</span> 참석을{' '}
              {confirm.attended ? '취소' : '추가'}할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
              <button onClick={handleConfirm} disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm text-white font-medium ${confirm.attended ? 'bg-red-500' : 'bg-green-500'}`}>
                {loading ? '처리 중...' : confirm.attended ? '참석 취소' : '참석 추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이벤트별 참석 현황 팝업 */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${TYPE_COLORS[selectedEvent.event_type] || 'bg-gray-100 text-gray-600'}`}>
                {TYPE_LABELS[selectedEvent.event_type] || selectedEvent.event_type}
              </span>
              <span className="text-xs text-gray-400">{format(new Date(selectedEvent.event_date), 'yyyy.M.d (EEE)', { locale: ko })}</span>
            </div>
            <p className="text-gray-900 font-bold text-lg mb-3">{selectedEvent.title}</p>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                placeholder="이름 검색..."
                style={{ fontSize: '16px' }}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c0392b]"
              />
            </div>

            <p className="text-xs font-medium text-green-600 mb-2">참석 {attendedList.length}명</p>
            <div className="space-y-1 mb-4">
              {attendedList.length === 0 ? (
                <p className="text-xs text-gray-300 mb-2">없음</p>
              ) : attendedList.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <Avatar profile={p} />
                  <span className="text-sm text-gray-800">{p.name}</span>
                </div>
              ))}
            </div>

            <p className="text-xs font-medium text-gray-400 mb-2">불참/미기록 {notAttendedList.length}명</p>
            <div className="space-y-1">
              {notAttendedList.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1 opacity-50">
                  <Avatar profile={p} />
                  <span className="text-sm text-gray-600">{p.name}</span>
                </div>
              ))}
            </div>

            {attendedList.length === 0 && notAttendedList.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-4">검색 결과가 없습니다</p>
            )}

            <button onClick={() => setSelectedEvent(null)} className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">닫기</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
          <span className="text-blue-500 text-sm">✏️</span>
          <p className="text-xs text-blue-600 font-medium">운영진 전용 — 참석 셀을 클릭해서 수정할 수 있어요</p>
        </div>
      )}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="이름 검색..." style={{ fontSize: '16px' }}
          className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c0392b]" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="sticky left-0 bg-gray-50 text-left px-4 py-3 font-medium text-gray-600 min-w-24 z-10">이름</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-center min-w-12">총</th>
                {events.map(event => (
                  <th key={event.id} className="px-2 py-3 font-medium text-gray-600 text-center min-w-16 relative">
                    <button
                      onClick={() => openEventModal(event)}
                      className="flex flex-col items-center gap-0.5 w-full hover:bg-gray-100 rounded-lg py-1 transition-colors"
                    >
                      <div className={`inline-flex px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[event.event_type] || event.event_type}
                      </div>
                      <div className="text-gray-400 font-normal text-xs">{format(new Date(event.event_date), 'M/d', { locale: ko })}</div>
                      <div className="text-gray-500 text-xs truncate max-w-14">{event.title}</div>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={events.length + 2} className="px-4 py-8 text-center text-gray-400">검색 결과가 없습니다</td></tr>
              ) : paged.map(profile => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-3 font-medium text-gray-900 z-10">
                    <div className="flex items-center gap-2">
                      <Avatar profile={profile} />
                      {profile.name}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-[#c0392b]">{getCount(profile.id)}</td>
                  {events.map(event => {
                    const attended = (localMap[profile.id] ?? []).includes(event.id)
                    return (
                      <td key={event.id}
                        className={`px-2 py-3 text-center ${isAdmin ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        onClick={() => handleCellClick(profile, event)}
                      >
                      {attended
                          ? <span className="inline-block bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">참석</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30">← 이전</button>
          <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30">다음 →</button>
        </div>
      )}
    </div>
  )
}
