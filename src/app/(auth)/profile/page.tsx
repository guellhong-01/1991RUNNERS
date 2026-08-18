'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { AtSign, Edit, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'default' | 'name' | 'joined_at' | 'birthday'>('default')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: cp } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setCurrentProfile(cp)
      const { data: ps } = await supabase.from('profiles').select('*')
        .in('role', ['member', 'admin'])
        .order('role', { ascending: false })
        .order('name', { ascending: true })
      setProfiles(ps || [])
    }
    load()
  }, [])

  const toggleSort = (key: 'name' | 'joined_at' | 'birthday') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const filtered = profiles
    .filter(p => p.name?.includes(searchQuery))
    .sort((a, b) => {
      if (sortKey === 'default') return 0
      const av = a[sortKey]
      const bv = b[sortKey]
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })

  const SortIcon = ({ column }: { column: 'name' | 'joined_at' | 'birthday' }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="text-gray-300" />
    return sortAsc ? <ArrowUp size={12} className="text-[#c0392b]" /> : <ArrowDown size={12} className="text-[#c0392b]" />
  }

  const GradeBadge = ({ grade, role }: { grade?: string; role: string }) => {
    const label = role === 'admin' ? '운영진' : (grade || '준회원')
    const color = role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
      label === '정회원' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
    return <span className={`badge ${color} whitespace-nowrap`}>{label}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원 프로필</h1>
          <p className="text-gray-500 mt-1">총 {profiles.length}명의 회원</p>
        </div>
        <Link href="/profile/edit">
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Edit size={16} />내 프로필 수정
          </button>
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="이름, 인스타 검색..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c0392b]"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-32">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-900">이름 <SortIcon column="name" /></button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-16">등급</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-24">
                  <button onClick={() => toggleSort('joined_at')} className="flex items-center gap-1 hover:text-gray-900">가입일 <SortIcon column="joined_at" /></button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-16">
                  <button onClick={() => toggleSort('birthday')} className="flex items-center gap-1 hover:text-gray-900">생일 <SortIcon column="birthday" /></button>
                </th>
                {currentProfile?.role === 'admin' && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-28">전화번호</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-20">PB (풀)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-20">PB (10K)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-24">인스타</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">검색 결과가 없습니다</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.id === userId ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3 min-w-32">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-7 h-7 rounded-full bg-[#e94560] flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                        {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.name} /> : p.name[0]}
                      </div>
                      <span className="font-medium text-gray-900">{p.name}</span>
                      {p.id === userId && <span className="text-xs text-blue-500">(나)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><GradeBadge grade={p.grade} role={p.role} /></td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {p.joined_at ? format(new Date(p.joined_at), 'yyyy.MM', { locale: ko }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {p.birthday ? format(new Date(p.birthday), 'MM/dd') : '-'}
                  </td>
                  {currentProfile?.role === 'admin' && (
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{p.pb_full || '-'}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{p.pb_10k || '-'}</td>
                  <td className="px-4 py-3">
                    {p.instagram ? (
                      <a href={`https://instagram.com/${p.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-1 text-pink-500 hover:text-pink-600 whitespace-nowrap">
                        <AtSign size={14} />
                        <span className="text-xs">{p.instagram}</span>
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
