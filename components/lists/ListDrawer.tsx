'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'
import type { CategoryEnum } from '@/lib/types/enums'
import {
  distinctTypesFromItems,
  matchesListFilters,
} from '@/lib/lists/filters'
import { distinctTagsFromItems } from '@/lib/lists/tags'

type Props = {
  open: boolean
  onClose: () => void
  activeListId: string | null
  onActiveListChange: (id: string | null) => void
  onPlaceIdsChange: (placeIds: string[]) => void
  onActiveTypeFiltersChange?: (types: CategoryEnum[]) => void
  onPlaceSelect: (placeId: string) => void
  onActiveListItemsChange?: (
    items: Array<{ id: string; list_id: string; place_id: string; tags: string[] }>
  ) => void
  focusedPlaceId?: string | null
  tagsRefreshKey?: number
  onTagsUpdated?: () => void
}

type ListsResponse = {
  lists: ListSummary[]
}

type ItemsResponse = {
  list: ListSummary
  items: ListItemRow[]
  distinct_tags?: string[]
}

export default function ListDrawer({
  open,
  onClose,
  activeListId,
  onActiveListChange,
  onPlaceIdsChange,
  onActiveTypeFiltersChange,
  onPlaceSelect,
  onActiveListItemsChange,
  focusedPlaceId = null,
  tagsRefreshKey,
  onTagsUpdated,
}: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [activeList, setActiveList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [distinctTags, setDistinctTags] = useState<string[]>([])
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [distinctTypes, setDistinctTypes] = useState<CategoryEnum[]>([])
  const [activeTypeFilters, setActiveTypeFilters] = useState<CategoryEnum[]>([])
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

  const createList = useCallback(async () => {
    const name = newListName.trim()
    if (!name) return
    setCreatingList(true)
    setListsError(null)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListsError(json?.error || `HTTP ${res.status}`)
        return
      }
      const list = json?.list as ListSummary | undefined
      if (list) {
        setLists((prev) => [...prev, list])
        setNewListName('')
        onActiveListChange(list.id)
      } else {
        await fetchLists()
      }
    } catch (e: unknown) {
      setListsError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setCreatingList(false)
    }
  }, [fetchLists, newListName, onActiveListChange])

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
        const nextItems = (json?.items ?? []) as ListItemRow[]
        setActiveList((json?.list ?? null) as ListSummary | null)
        setItems(nextItems)
        if (Array.isArray(json?.distinct_tags)) {
          setDistinctTags(json.distinct_tags)
          setActiveTagFilters((prev) =>
            prev.filter((tag) => json.distinct_tags?.includes(tag))
          )
        } else {
          const nextDistinct = distinctTagsFromItems(nextItems)
          setDistinctTags(nextDistinct)
          setActiveTagFilters((prev) =>
            prev.filter((tag) => nextDistinct.includes(tag))
          )
        }
        const nextDistinctTypes = distinctTypesFromItems(nextItems)
        setDistinctTypes(nextDistinctTypes)
        setActiveTypeFilters((prev) =>
          prev.filter((type) => nextDistinctTypes.includes(type))
        )
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
      setDistinctTags([])
      setActiveTagFilters([])
      setDistinctTypes([])
      setActiveTypeFilters([])
      onPlaceIdsChange([])
      return
    }

    fetchItems(activeListId)
  }, [activeListId, fetchItems, onPlaceIdsChange, tagsRefreshKey])

  useEffect(() => {
    if (!open || !activeListId) return
    fetchItems(activeListId)
  }, [open, activeListId, fetchItems])

  useEffect(() => {
    setActiveTagFilters([])
    setActiveTypeFilters([])
  }, [activeListId])

  useEffect(() => {
    onActiveTypeFiltersChange?.(activeTypeFilters)
  }, [activeTypeFilters, onActiveTypeFiltersChange])

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

  useEffect(() => {
    if (!activeListId) {
      onActiveListItemsChange?.([])
      return
    }
    const mapped = items
      .map((item) => ({
        id: item.id,
        list_id: activeListId,
        place_id: item.place?.id,
        tags: item.tags ?? [],
      }))
      .filter((item): item is { id: string; list_id: string; place_id: string; tags: string[] } =>
        Boolean(item.place_id)
      )
    onActiveListItemsChange?.(mapped)
  }, [activeListId, items, onActiveListItemsChange])

  const filteredItems = useMemo(() => {
    if (!activeTagFilters.length && !activeTypeFilters.length) return items
    return items.filter((item) =>
      matchesListFilters(item, activeTypeFilters, activeTagFilters)
    )
  }, [activeTagFilters, activeTypeFilters, items])

  const handleTagToggle = useCallback((tag: string) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleTypeToggle = useCallback((type: CategoryEnum) => {
    setActiveTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }, [])

  const handleClearTagFilters = useCallback(() => {
    setActiveTagFilters([])
  }, [])

  const handleClearTypeFilters = useCallback(() => {
    setActiveTypeFilters([])
  }, [])

  const handleTagsUpdate = useCallback(
    async (itemId: string, tags: string[]) => {
      if (!activeListId) {
        throw new Error('No active list selected')
      }
      const res = await fetch(
        `/api/lists/${activeListId}/items/${itemId}/tags`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tags }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as {
        item?: { tags?: string[] }
        error?: string
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updatedTags = Array.isArray(json?.item?.tags)
        ? json.item.tags
        : []
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === itemId ? { ...item, tags: updatedTags } : item
        )
        const nextDistinct = distinctTagsFromItems(next)
        setDistinctTags(nextDistinct)
        setActiveTagFilters((current) =>
          current.filter((tag) => nextDistinct.includes(tag))
        )
        return next
      })
      onTagsUpdated?.()
      return updatedTags
    },
    [activeListId, onTagsUpdated]
  )

  if (!open) return null

  return (
    <aside
      className="glass-panel absolute left-4 top-20 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl text-slate-100"
      data-testid="list-drawer"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Lists</h2>
          <p className="text-xs text-slate-300">Keep the map in view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onActiveListChange(null)}
            className="text-xs text-slate-300 hover:text-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-300 hover:text-slate-100"
          >
            Close
          </button>
        </div>
      </div>

      <div className="border-b border-white/10 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            className="glass-input flex-1 text-xs"
            placeholder="New list name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button
            type="button"
            onClick={createList}
            disabled={creatingList || !newListName.trim()}
            className="glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-50"
          >
            {creatingList ? 'Creating…' : 'Create'}
          </button>
        </div>
        {listsLoading ? (
          <p className="text-xs text-slate-300">Loading lists…</p>
        ) : null}
        {listsError ? (
          <p className="text-xs text-red-300">{listsError}</p>
        ) : null}
        {!listsLoading && !lists.length ? (
          <p className="text-xs text-slate-300">No lists yet.</p>
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
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selected
                    ? 'border-slate-100 bg-slate-100 text-slate-900'
                    : 'border-white/10 text-slate-200 hover:border-white/30'
                }`}
              >
                {list.name}
              </button>
            )
          })}
        </div>
        <a
          className="text-[11px] text-slate-300 underline"
          href="/lists"
        >
          Manage lists
        </a>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        <ListDetailBody
          list={activeList}
          items={filteredItems}
          loading={itemsLoading}
          error={itemsError}
          emptyLabel={
            activeList
              ? activeTagFilters.length || activeTypeFilters.length
                ? 'No places match these filters.'
                : 'No places in this list yet.'
              : 'Select a list to see its places.'
          }
          onPlaceSelect={onPlaceSelect}
          focusedPlaceId={focusedPlaceId}
          availableTypes={distinctTypes}
          activeTypeFilters={activeTypeFilters}
          onTypeFilterToggle={handleTypeToggle}
          onClearTypeFilters={handleClearTypeFilters}
          availableTags={distinctTags}
          activeTagFilters={activeTagFilters}
          onTagFilterToggle={handleTagToggle}
          onClearTagFilters={handleClearTagFilters}
          onTagsUpdate={handleTagsUpdate}
          tone="dark"
        />
      </div>
    </aside>
  )
}
