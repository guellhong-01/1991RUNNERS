'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function StravaMapModal({
  activityId,
  title,
  onClose,
}: {
  activityId: number
  title: string
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const placeholder = document.createElement('div')
    placeholder.className = 'strava-embed-placeholder'
    placeholder.setAttribute('data-embed-type', 'activity')
    placeholder.setAttribute('data-embed-id', String(activityId))
    placeholder.setAttribute('data-style', 'standard')
    containerRef.current.appendChild(placeholder)

    const script = document.createElement('script')
    script.src = 'https://strava-embeds.com/embed.js'
    containerRef.current.appendChild(script)
  }, [activityId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-4 max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-gray-900 text-sm truncate pr-2">{title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={20} />
          </button>
        </div>
        <div ref={containerRef} />
      </div>
    </div>
  )
}
