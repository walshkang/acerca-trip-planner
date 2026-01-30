'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type ListSummary = {
  id: string
  name: string
  is_default: boolean
}

type ListsResponse = {
  lists: ListSummary[]
}

type Props = {
  placeId: string
  initialSelectedIds: string[]
  onMembershipChange?: () => void
}

export default function PlaceListMembershipEditor({
  placeId,
  initialSelectedIds,
  onMembershipChange,
}: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const initialKey = useMemo(
    () => initialSelectedIds.join('|'),
    [initialSelectedIds]
  )

  const fetchLists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lists')
      const json = (await res.json().catch(() => ({}))) as Partial<ListsResponse>
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      const nextLists = (json?.lists ?? []) as ListSummary[]
      setLists(nextLists)
      setSelectedIds((prev) => prev.filter((id) => nextLists.some((l) => l.id === id)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  useEffect(() => {
    setSelectedIds(initialSelectedIds)
  }, [initialKey, placeId])

  const toggleMembership = useCallback(
    async (listId: string) => {
      setBusyId(listId)
      setError(null)
      const isSelected = selectedSet.has(listId)
      try {
        if (isSelected) {
          const res = await fetch(
            `/api/lists/${listId}/items?place_id=${encodeURIComponent(placeId)}`,
            { method: 'DELETE' }
          )
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            setError(json?.error || `HTTP ${res.status}`)
            return
          }
          setSelectedIds((prev) => prev.filter((id) => id !== listId))
          onMembershipChange?.()
        } else {
          const res = await fetch(`/api/lists/${listId}/items`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ place_id: placeId }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            setError(json?.error || `HTTP ${res.status}`)
            return
          }
          setSelectedIds((prev) => (prev.includes(listId) ? prev : [...prev, listId]))
          onMembershipChange?.()
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Request failed')
      } finally {
        setBusyId(null)
      }
    },
    [placeId, selectedSet]
  )

  if (loading && !lists.length) {
    return <p className="text-sm text-gray-500">Loading lists…</p>
  }

  if (!lists.length) {
    return (
      <div className="space-y-2">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-gray-500">
            No lists yet. Create one from the Lists page.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {lists.map((list) => {
          const selected = selectedSet.has(list.id)
          const disabled = busyId === list.id
          return (
            <button
              key={list.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggleMembership(list.id)}
              className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${
                selected
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              {selected ? '✓ ' : ''}
              {list.name}
              {list.is_default ? ' · Default' : ''}
            </button>
          )
        })}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-[11px] text-gray-500">
        Add/remove this place from lists. Changes are saved immediately.
      </p>
    </div>
  )
}
