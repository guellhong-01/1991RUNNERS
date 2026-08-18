'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Check, X, Upload } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'

interface Props {
  isAdmin: boolean
  initialDescription: string
  initialBannerUrl: string | null
}

export default function AboutClient({ isAdmin, initialDescription, initialBannerUrl }: Props) {
  const supabase = createClient()
  const [description, setDescription] = useState(initialDescription)
  const [editingDesc, setEditingDesc] = useState(false)
  const [tempDesc, setTempDesc] = useState(initialDescription)
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveDescription = async () => {
    await supabase.from('club_info').update({ description: tempDesc }).eq('id', 1)
    setDescription(tempDesc)
    setEditingDesc(false)
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file, 1600, 0.8)
    const ext = compressed.name.split('.').pop()
    const path = `banner_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('club-images').upload(path, compressed)
    if (!error) {
      const { data } = supabase.storage.from('club-images').getPublicUrl(path)
      const url = data.publicUrl
      await supabase.from('club_info').update({ banner_url: url }).eq('id', 1)
      setBannerUrl(url)
    }
    setUploading(false)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">뛰꼬양 소개</h1>
        <p className="text-gray-500 mt-1">About 1991RUNNERS</p>
      </div>

      {/* 배너 */}
      <div className="card p-0 overflow-hidden">
        <div className="relative w-full" style={{ minHeight: '200px' }}>
          {bannerUrl ? (
            <img src={bannerUrl} alt="배너" className="w-full object-cover" />
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-16 bg-gray-50">
              <div className="text-6xl mb-4">🏃</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">1991RUNNERS</h2>
              <p className="text-gray-500">뛰꼬양 러닝 클럽</p>
            </div>
          )}
          {isAdmin && (
            <div className="absolute bottom-3 right-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-lg transition-colors"
              >
                <Upload size={14} />{uploading ? '업로드 중...' : '사진 변경'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 클럽 소개 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">클럽 소개</h2>
          {isAdmin && !editingDesc && (
            <button onClick={() => { setTempDesc(description); setEditingDesc(true) }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
              <Pencil size={14} />수정
            </button>
          )}
        </div>
        {editingDesc ? (
          <div className="space-y-3">
            <textarea
              value={tempDesc}
              onChange={(e) => setTempDesc(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-600 leading-relaxed resize-none focus:outline-none focus:border-[#e94560]"
              rows={5}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingDesc(false)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                <X size={14} />취소
              </button>
              <button onClick={saveDescription} className="flex items-center gap-1 px-3 py-1.5 bg-[#e94560] text-white text-sm rounded-lg hover:bg-[#d63651]">
                <Check size={14} />저장
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#e94560] mb-1">150+</div>
          <p className="text-sm text-gray-500">활동 회원</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#e94560] mb-1">매주</div>
          <p className="text-sm text-gray-500">정기런 진행</p>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#e94560] mb-1">🏅</div>
          <p className="text-sm text-gray-500">대회 참가</p>
        </div>
      </div>

      <div className="card bg-[#1a1a2e] text-white text-center py-8">
        <p className="text-lg font-medium mb-2">인스타그램 팔로우</p>
        <a href="https://instagram.com/1991runners" target="_blank" rel="noopener noreferrer"
          className="text-[#e94560] font-bold text-xl hover:underline">
          @1991runners
        </a>
      </div>
    </div>
  )
}
