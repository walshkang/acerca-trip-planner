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
  activeListId?: string | null
  onClose: () => void
}

type ListsResponse = {
  list_ids: string[]
  list_items?: Array<{ list_id: string; tags?: string[] | null }>
  user_tags?: string[]
}

export default function PlaceDrawer({
  open,
  place,
  activeListId = null,
  onClose,
}: Props) {
  const [listIds, setListIds] = useState<string[]>([])
  const [listItems, setListItems] = useState<
    Array<{ list_id: string; tags: string[] }>
  >([])
  const [userTags, setUserTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !place) {
      setListIds([])
      setListItems([])
      setUserTags([])
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
          setListItems(
            ((json?.list_items ?? []) as Array<{
              list_id: string
              tags?: string[] | null
            }>).map((item) => ({
              list_id: item.list_id,
              tags: Array.isArray(item.tags) ? item.tags : [],
            }))
          )
          setUserTags((json?.user_tags ?? []) as string[])
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

  const activeListTags =
    activeListId &&
    listItems.find((item) => item.list_id === activeListId)?.tags?.length
      ? listItems.find((item) => item.list_id === activeListId)?.tags ?? []
      : []

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

        {activeListTags.length ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-gray-600">
              List tags
            </p>
            <div className="flex flex-wrap gap-2">
              {activeListTags.map((tag) => (
                <span
                  key={`list-tag:${tag}`}
                  className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : userTags.length ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-gray-600">
              Your tags
            </p>
            <div className="flex flex-wrap gap-2">
              {userTags.map((tag) => (
                <span
                  key={`user-tag:${tag}`}
                  className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <PlaceListMembershipEditor
          placeId={place.id}
          initialSelectedIds={listIds}
        />
      </div>
    </aside>
  )
}
