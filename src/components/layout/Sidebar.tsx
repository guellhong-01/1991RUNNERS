'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { Calendar, Megaphone, Wallet, Settings, LogOut, Users, BookOpen, ClipboardList, Archive, ChevronDown, ChevronRight, Newspaper, Star, MessageSquare, Menu, X, Pencil, Camera, Trophy, Map, Activity } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { compressImage } from '@/lib/compressImage'

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [boardOpen, setBoardOpen] = useState(pathname.startsWith('/board'))
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith('/admin'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState((profile as any).avatar_url ?? null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [newEventCount, setNewEventCount] = useState(0)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const [profileForm, setProfileForm] = useState({
    name: profile.name ?? '',
    phone: (profile as any).phone ?? '',
    birthday: (profile as any).birthday ?? '',
    instagram: (profile as any).instagram ?? '',
    pb_full: (profile as any).pb_full ?? '',
    pb_10k: (profile as any).pb_10k ?? '',
    joined_at: (profile as any).joined_at ? String((profile as any).joined_at).slice(0, 7) : '',
  })

  useEffect(() => {
    const checkNewEvents = async () => {
      const lastVisited = localStorage.getItem('calendar_last_visited')
      if (!lastVisited) {
        localStorage.setItem('calendar_last_visited', new Date().toISOString())
        return
      }
      const { data } = await supabase
        .from('events')
        .select('id')
        .gt('created_at', lastVisited)
      setNewEventCount(data?.length ?? 0)
    }
    checkNewEvents()
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const compressed = await compressImage(file, 320, 0.85)
    const ext = compressed.name.split('.').pop()
    const path = `${profile.id}/avatar_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
      setAvatarUrl(data.publicUrl)
    }
    setAvatarUploading(false)
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    const updateData = {
      ...profileForm,
      birthday: profileForm.birthday.trim() === '' ? null : profileForm.birthday,
      joined_at: profileForm.joined_at.trim() === '' ? null : profileForm.joined_at + '-01',
    }
    await supabase.from('profiles').update(updateData).eq('id', profile.id)
    setProfileSaving(false)
    setEditProfileOpen(false)
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const NavItem = ({ href, icon, label, adminOnly = false, badge }: { href: string; icon: React.ReactNode; label: string; adminOnly?: boolean; badge?: number }) => {
    if (adminOnly && profile.role !== 'admin') return null
    return (
      <Link href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive(href) ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
        {icon}
        <span className="flex-1">{label}</span>
        {badge && badge > 0 && (
          <span className="bg-[#c0392b] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#c0392b] flex items-center justify-center text-sm font-bold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span>{profile.name[0]}</span>
              )}
            </div>
            <button
              onClick={() => avatarFileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100"
            >
              <Camera size={9} className="text-gray-600" />
            </button>
            <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{profile.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${profile.role === 'admin' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/10 text-gray-400'}`}>
              {profile.role === 'admin' ? '운영진' : (profile as any).grade || '준회원'}
            </span>
          </div>
          <button onClick={() => setEditProfileOpen(true)} className="text-gray-400 hover:text-white transition-colors shrink-0">
            <Pencil size={14} />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavItem href="/board/notice" icon={<Star size={18} />} label="뛰꼬양 필독사항" />
        <NavItem href="/profile" icon={<Users size={18} />} label="회원 프로필" />
        <NavItem href="/races" icon={<Trophy size={18} />} label="대회 일정" />
        <NavItem href="/calendar" icon={<Calendar size={18} />} label="뛰꼬양 캘린더" badge={newEventCount} />
        <NavItem href="/strava" icon={<Activity size={18} />} label="스트라바 활동" />
        <div>
          <button
            onClick={() => setBoardOpen(!boardOpen)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname.startsWith('/board') ? 'text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <div className="flex items-center gap-3"><Megaphone size={18} />게시판</div>
            {boardOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {boardOpen && (
            <div className="ml-6 mt-1 space-y-1">
              <Link href="/about" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive('/about') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <BookOpen size={14} />뛰꼬양 소개
              </Link>
              <Link href="/board/photo" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive('/board/photo') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <Camera size={14} />뛰꼬양 사진
              </Link>
              <Link href="/board/history" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive('/board/history') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <ClipboardList size={14} />뛰꼬양 히스토리
              </Link>
              <Link href="/board/archive" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive('/board/archive') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <Archive size={14} />뛰꼬양 로고
              </Link>
              <Link href="/gpx" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive('/gpx') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <Map size={14} />GPX 코스 모음
              </Link>
            </div>
          )}
        </div>
        <NavItem href="/attendance" icon={<ClipboardList size={18} />} label="뛰꼬양 출석표" />
        <NavItem href="/finance" icon={<Wallet size={18} />} label="회비 내역" />
        {profile.role === 'admin' && (
          <div>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors ${pathname.startsWith('/admin') ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Settings size={18} />
              <span className="flex-1 text-left">관리자</span>
              {adminOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {adminOpen && (
              <div className="ml-4 mt-1 space-y-1">
                <Link href="/admin" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${pathname === '/admin' ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                  <Users size={14} />가입 현황
                </Link>
                <Link href="/admin/attendance" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${pathname === '/admin/attendance' ? 'bg-[#c0392b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                  <ClipboardList size={14} />공식 활동 출석부
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors w-full">
          <LogOut size={18} />로그아웃
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black text-white flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <img src="https://kvotmnyktvgqlplfbuqh.supabase.co/storage/v1/object/public/club-images/1991.png" alt="1991RUNNERS" className="w-8 h-8 object-contain" />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-black text-white flex flex-col h-screen overflow-y-auto mt-12">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-black text-white flex-col min-h-screen shrink-0">
        <SidebarContent />
      </aside>

      {editProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditProfileOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">내 정보 수정</h2>
              <button onClick={() => setEditProfileOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: '이름', key: 'name', type: 'text' },
                { label: '전화번호', key: 'phone', type: 'text' },
                { label: '생일', key: 'birthday', type: 'date' },
                { label: '가입일', key: 'joined_at', type: 'month' },
                { label: '풀마라톤 PB', key: 'pb_full', type: 'text' },
                { label: '10K PB', key: 'pb_10k', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm text-gray-600 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={(profileForm as any)[key] ?? ''}
                    onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c0392b] text-gray-900"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">인스타그램 (@제외 후 아이디만 입력)</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#c0392b]">
                  <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">@</span>
                  <input
                    value={profileForm.instagram ?? ''}
                    onChange={e => setProfileForm({ ...profileForm, instagram: e.target.value.replace('@', '') })}
                    placeholder="아이디"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end p-6 border-t">
              <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">취소</button>
              <button onClick={handleProfileSave} disabled={profileSaving} className="px-4 py-2 bg-[#c0392b] text-white text-sm rounded-lg hover:bg-[#a93226] disabled:opacity-50">
                {profileSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
