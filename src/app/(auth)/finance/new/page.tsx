'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FINANCE_CATEGORIES } from '@/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { compressImage } from '@/lib/compressImage'

export default function NewFinancePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    transaction_date: new Date().toISOString().split('T')[0],
    balance_after: ''
  })

  const handleImageUpload = async (file: File) => {
    setImageUploading(true)
    const compressed = await compressImage(file, 1280, 0.8)
    const ext = compressed.name.split('.').pop()
    const path = `finances/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('archive-images').upload(path, compressed)
    if (!error) {
      const { data } = supabase.storage.from('archive-images').getPublicUrl(path)
      setImageUrl(data.publicUrl)
      setImagePreview(data.publicUrl)
    }
    setImageUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('finances').insert({
      type: form.type,
      amount: parseInt(form.amount),
      description: form.description,
      category: form.category || null,
      transaction_date: form.transaction_date,
      balance_after: form.balance_after ? parseInt(form.balance_after) : null,
      created_by: user?.id,
      image_url: imageUrl || null,
    })
    if (!error) { router.push('/finance'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/finance" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">회비 내역 추가</h1>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">구분 *</label>
            <div className="flex gap-3">
              {(['income', 'expense'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${form.type === t ? (t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}>
                  {t === 'income' ? '💰 수입' : '💸 지출'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">금액 (원) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" placeholder="10000" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명 *</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="예: 10월 회비 수납 (10명)" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                <option value="">선택 안 함</option>
                {FINANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
              <input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="input" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">거래 후 잔액 (원)</label>
            <input type="number" value={form.balance_after} onChange={(e) => setForm({ ...form, balance_after: e.target.value })} className="input" placeholder="선택 사항" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">증빙 사진 (선택)</label>
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              className="text-sm text-gray-600"
            />
            {imageUploading && <p className="text-xs text-gray-400 mt-1">업로드 중...</p>}
            {imagePreview && (
              <img src={imagePreview} alt="증빙" className="mt-2 rounded-lg max-h-48 object-contain border border-gray-100" />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Link href="/finance" className="btn-secondary flex-1 text-center py-3">취소</Link>
            <button type="submit" disabled={loading || imageUploading} className="btn-primary flex-1 py-3 disabled:opacity-50">
              {loading ? '등록 중...' : '내역 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
