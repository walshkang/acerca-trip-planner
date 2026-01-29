'use client'

import { useEffect, useState } from 'react'
import PlaceListMembershipEditor from '@/components/places/PlaceListMembershipEditor'

export type PlaceDrawerSummary = {
  id: string
  name: string
  category: string
}

type Props = {
  open: boolean
  place: PlaceDrawerSummary | null
  onClose: () => void
}

type ListsResponse = {
  list_ids: string[]
}

export default function PlaceDrawer({ open, place, onClose }: Props) {
  const [listIds, setListIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !place) {
      setListIds([])
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    fetch(`/api/places/${place.id}/lists`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Partial<ListsResponse>
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        if (active) {
          setListIds((json?.list_ids ?? []) as string[])
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Request failed')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [open, place])

  if (!open || !place) return null

  return (
    <aside className="absolute right-4 top-24 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Place</p>
          <h2 className="text-sm font-semibold text-gray-900">{place.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
            {place.category}
          </span>
          <a className="text-[11px] text-gray-500 underline" href={`/places/${place.id}`}>
            Open full details
          </a>
        </div>

        {loading ? <p className="text-xs text-gray-500">Loading lists…</p> : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <PlaceListMembershipEditor
          placeId={place.id}
          initialSelectedIds={listIds}
        />
      </div>
    </aside>
  )
}
