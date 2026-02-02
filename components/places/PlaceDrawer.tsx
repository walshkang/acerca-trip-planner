'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import PlaceListMembershipEditor from '@/components/places/PlaceListMembershipEditor'
import { normalizeTagList } from '@/lib/lists/tags'

export type PlaceDrawerSummary = {
  id: string
  name: string
  category: string
}

type Props = {
  open: boolean
  place: PlaceDrawerSummary | null
  activeListId?: string | null
  activeListItemOverride?: { id: string; list_id: string; tags: string[] } | null
  topOffset?: number
  onClose: () => void
  tagsRefreshKey?: number
  onTagsUpdated?: () => void
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
  activeListItemOverride = null,
  topOffset,
  onClose,
  tagsRefreshKey,
  onTagsUpdated,
}: Props) {
  const [listIds, setListIds] = useState<string[]>([])
  const [listItems, setListItems] = useState<
    Array<{ id: string; list_id: string; tags: string[] }>
  >([])
  const [userTags, setUserTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagStatus, setTagStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [tagError, setTagError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeListItem = useMemo(() => {
    if (!activeListId) return null
    return listItems.find((item) => item.list_id === activeListId) ?? null
  }, [activeListId, listItems])
  const effectiveActiveListItem = useMemo(() => {
    if (activeListItem) return activeListItem
    if (
      activeListItemOverride &&
      activeListId &&
      activeListItemOverride.list_id === activeListId
    ) {
      return activeListItemOverride
    }
    return null
  }, [activeListId, activeListItem, activeListItemOverride])
  const effectiveListIds = useMemo(() => {
    if (!activeListItemOverride) return listIds
    const listId = activeListItemOverride.list_id
    if (listIds.includes(listId)) return listIds
    return [...listIds, listId]
  }, [activeListItemOverride, listIds])

  const fetchMembership = useCallback(async () => {
    if (!open || !place) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/places/${place.id}/lists`)
      const json = (await res.json().catch(() => ({}))) as Partial<ListsResponse>
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      setListIds((json?.list_ids ?? []) as string[])
      setListItems(
        ((json?.list_items ?? []) as Array<{
          id: string
          list_id: string
          tags?: string[] | null
        }>).map((item) => ({
          id: item.id,
          list_id: item.list_id,
          tags: Array.isArray(item.tags) ? item.tags : [],
        }))
      )
      setUserTags((json?.user_tags ?? []) as string[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [open, place])

  useEffect(() => {
    if (!open || !place) {
      setListIds([])
      setListItems([])
      setUserTags([])
      setTagInput('')
      setTagStatus('idle')
      setTagError(null)
      setError(null)
      return
    }

    fetchMembership()
  }, [fetchMembership, open, place, tagsRefreshKey])

  if (!open || !place) return null

  const activeListTags = effectiveActiveListItem?.tags ?? []

  async function commitTags(nextTags: string[]) {
    if (!activeListId || !effectiveActiveListItem) return
    setTagStatus('saving')
    setTagError(null)
    try {
      const res = await fetch(
        `/api/lists/${activeListId}/items/${effectiveActiveListItem.id}/tags`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tags: nextTags }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as {
        item?: { tags?: string[] }
        error?: string
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updated = Array.isArray(json?.item?.tags) ? json.item.tags : []
      setListItems((prev) =>
        prev.map((item) =>
          item.id === effectiveActiveListItem.id
            ? { ...item, tags: updated }
            : item
        )
      )
      setTagInput('')
      setTagStatus('saved')
      onTagsUpdated?.()
    } catch (err: unknown) {
      setTagStatus('error')
      setTagError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function resetTagStatus() {
    if (tagStatus !== 'idle') {
      setTagStatus('idle')
      setTagError(null)
    }
  }

  async function handleAddTag(event?: FormEvent) {
    event?.preventDefault()
    const nextAdd = normalizeTagList(tagInput)
    if (!nextAdd || !nextAdd.length) return
    const merged = normalizeTagList([...(activeListTags ?? []), ...nextAdd]) ?? []
    await commitTags(merged)
  }

  async function handleRemoveTag(tag: string) {
    const next = activeListTags.filter((t) => t !== tag)
    await commitTags(next)
  }

  async function handleClearTags() {
    await commitTags([])
  }

  const computedTop = Math.max(96, (topOffset ?? 0) + 16)

  return (
    <aside
      className="absolute right-4 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-lg"
      style={{ top: `${computedTop}px` }}
      data-testid="place-drawer"
    >
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

        {effectiveActiveListItem ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-600">
              List tags
            </p>
            {activeListTags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeListTags.map((tag) => (
                  <span
                    key={`list-tag:${tag}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[10px] text-gray-400 hover:text-gray-600"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearTags}
                  className="text-[10px] text-gray-500 underline"
                >
                  × Clear
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">No tags yet.</p>
            )}
            <form onSubmit={handleAddTag} className="flex flex-wrap items-center gap-2">
              <input
                className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
                placeholder="Add tags (comma-separated)"
                value={tagInput}
                onChange={(event) => {
                  setTagInput(event.target.value)
                  resetTagStatus()
                }}
                disabled={tagStatus === 'saving'}
              />
              <button
                type="submit"
                className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 disabled:opacity-60"
                disabled={tagStatus === 'saving'}
              >
                {tagStatus === 'saving' ? 'Saving…' : 'Add'}
              </button>
            </form>
            {tagStatus === 'saved' ? (
              <p className="text-[11px] text-green-700">Saved.</p>
            ) : null}
            {tagStatus === 'error' ? (
              <p className="text-[11px] text-red-600">{tagError}</p>
            ) : null}
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
        ) : activeListId ? (
          <p className="text-[11px] text-gray-500">
            Add this place to the active list to edit tags.
          </p>
        ) : null}

        <PlaceListMembershipEditor
          placeId={place.id}
          initialSelectedIds={effectiveListIds}
          onMembershipChange={() => {
            fetchMembership()
          }}
        />
      </div>
    </aside>
  )
}
