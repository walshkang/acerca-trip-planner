'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'

type Props = {
  open: boolean
  onClose: () => void
  activeListId: string | null
  onActiveListChange: (id: string | null) => void
  onPlaceIdsChange: (placeIds: string[]) => void
  onPlaceSelect: (placeId: string) => void
}

type ListsResponse = {
  lists: ListSummary[]
}

type ItemsResponse = {
  list: ListSummary
  items: ListItemRow[]
}

export default function ListDrawer({
  open,
  onClose,
  activeListId,
  onActiveListChange,
  onPlaceIdsChange,
  onPlaceSelect,
}: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [activeList, setActiveList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const selectedListIds = useMemo(() => {
    return activeListId ? new Set([activeListId]) : new Set<string>()
  }, [activeListId])

  const fetchLists = useCallback(async () => {
    setListsLoading(true)
    setListsError(null)
    try {
      const res = await fetch('/api/lists')
      const json = (await res.json().catch(() => ({}))) as Partial<ListsResponse>
      if (!res.ok) {
        setListsError(json?.error || `HTTP ${res.status}`)
        return
      }
      setLists((json?.lists ?? []) as ListSummary[])
    } catch (e: unknown) {
      setListsError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setListsLoading(false)
    }
  }, [])

  const fetchItems = useCallback(
    async (listId: string) => {
      setItemsLoading(true)
      setItemsError(null)
      try {
        const res = await fetch(`/api/lists/${listId}/items?limit=200`)
        const json = (await res.json().catch(() => ({}))) as Partial<ItemsResponse>
        if (!res.ok) {
          setItemsError(json?.error || `HTTP ${res.status}`)
          return
        }
        setActiveList((json?.list ?? null) as ListSummary | null)
        setItems((json?.items ?? []) as ListItemRow[])
      } catch (e: unknown) {
        setItemsError(e instanceof Error ? e.message : 'Request failed')
      } finally {
        setItemsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!open) return
    fetchLists()
  }, [fetchLists, open])

  useEffect(() => {
    if (!activeListId) {
      setActiveList(null)
      setItems([])
      onPlaceIdsChange([])
      return
    }

    fetchItems(activeListId)
  }, [activeListId, fetchItems, onPlaceIdsChange])

  useEffect(() => {
    if (!items.length) {
      onPlaceIdsChange([])
      return
    }
    const placeIds = items
      .map((item) => item.place?.id)
      .filter((id): id is string => Boolean(id))
    onPlaceIdsChange(placeIds)
  }, [items, onPlaceIdsChange])

  if (!open) return null

  return (
    <aside className="absolute left-4 top-20 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Lists</h2>
          <p className="text-xs text-gray-500">Keep the map in view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onActiveListChange(null)}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 px-4 py-3 space-y-2">
        {listsLoading ? (
          <p className="text-xs text-gray-500">Loading lists…</p>
        ) : null}
        {listsError ? (
          <p className="text-xs text-red-600">{listsError}</p>
        ) : null}
        {!listsLoading && !lists.length ? (
          <p className="text-xs text-gray-500">No lists yet.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {lists.map((list) => {
            const selected = selectedListIds.has(list.id)
            return (
              <button
                key={list.id}
                type="button"
                onClick={() =>
                  onActiveListChange(selected ? null : list.id)
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {list.name}
              </button>
            )
          })}
        </div>
        <a
          className="text-[11px] text-gray-500 underline"
          href="/lists"
        >
          Manage lists
        </a>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        <ListDetailBody
          list={activeList}
          items={items}
          loading={itemsLoading}
          error={itemsError}
          emptyLabel="Select a list to see its places."
          onPlaceSelect={onPlaceSelect}
        />
      </div>
    </aside>
  )
}
