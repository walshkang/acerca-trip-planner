'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

type ApiResponse = {
  list: ListSummary
  items: ListItemRow[]
  distinct_tags?: string[]
}

type SearchResult = {
  id: string
  name: string | null
  category: string
  display_address: string | null
}

type Props = {
  listId: string
}

export default function ListDetailPanel({ listId }: Props) {
  const router = useRouter()
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [distinctTags, setDistinctTags] = useState<string[]>([])
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [distinctTypes, setDistinctTypes] = useState<CategoryEnum[]>([])
  const [activeTypeFilters, setActiveTypeFilters] = useState<CategoryEnum[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTagInputs, setSearchTagInputs] = useState<Record<string, string>>(
    {}
  )
  const [addedResultIds, setAddedResultIds] = useState<Set<string>>(new Set())
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reconcileTagFilters = useCallback((nextItems: ListItemRow[]) => {
    const nextDistinct = distinctTagsFromItems(nextItems)
    setDistinctTags(nextDistinct)
    setActiveTagFilters((prev) =>
      prev.filter((tag) => nextDistinct.includes(tag))
    )
  }, [])

  const reconcileTypeFilters = useCallback((nextItems: ListItemRow[]) => {
    const nextDistinct = distinctTypesFromItems(nextItems)
    setDistinctTypes(nextDistinct)
    setActiveTypeFilters((prev) =>
      prev.filter((type) => nextDistinct.includes(type))
    )
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items?limit=200`)
      const json = (await res.json().catch(() => ({}))) as Partial<ApiResponse>
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      if (json?.list) {
        setList(json.list)
      }
      const nextItems = (json?.items ?? []) as ListItemRow[]
      setItems(nextItems)
      if (Array.isArray(json?.distinct_tags)) {
        setDistinctTags(json.distinct_tags)
        setActiveTagFilters((prev) =>
          prev.filter((tag) => json.distinct_tags?.includes(tag))
        )
      } else {
        reconcileTagFilters(nextItems)
      }
      reconcileTypeFilters(nextItems)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [listId, reconcileTagFilters, reconcileTypeFilters])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    setActiveTagFilters([])
    setDistinctTags([])
    setActiveTypeFilters([])
    setDistinctTypes([])
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
    setSearchTagInputs({})
    setAddedResultIds(new Set())
  }, [listId])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        const res = await fetch(
          `/api/places/local-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        )
        const json = (await res.json().catch(() => ({}))) as {
          results?: SearchResult[]
          error?: string
        }
        if (!res.ok) {
          setSearchError(json?.error || `HTTP ${res.status}`)
          setSearchResults([])
          return
        }
        setSearchResults((json?.results ?? []) as SearchResult[])
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return
        setSearchError(err instanceof Error ? err.message : 'Request failed')
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false)
        }
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [searchQuery])

  const filteredItems = useMemo(() => {
    if (!activeTagFilters.length && !activeTypeFilters.length) return items
    return items.filter((item) =>
      matchesListFilters(item, activeTypeFilters, activeTagFilters)
    )
  }, [activeTagFilters, activeTypeFilters, items])

  const existingPlaceIds = useMemo(() => {
    return new Set(
      items
        .map((item) => item.place?.id)
        .filter((id): id is string => Boolean(id))
    )
  }, [items])

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

  const handleSearchTagChange = useCallback((placeId: string, value: string) => {
    setSearchTagInputs((prev) => ({ ...prev, [placeId]: value }))
  }, [])

  const handleAddPlace = useCallback(
    async (placeId: string) => {
      if (addingPlaceId) return
      setAddingPlaceId(placeId)
      setSearchError(null)
      try {
        const tagsInput = searchTagInputs[placeId] ?? ''
        const payload: { place_id: string; tags?: string } = {
          place_id: placeId,
        }
        if (tagsInput.trim().length) {
          payload.tags = tagsInput
        }
        const listRes = await fetch(`/api/lists/${listId}/items`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const listJson = await listRes.json().catch(() => ({}))
        if (!listRes.ok) {
          setSearchError(listJson?.error || `HTTP ${listRes.status}`)
          return
        }
        setSearchTagInputs((prev) => ({ ...prev, [placeId]: '' }))
        setAddedResultIds((prev) => new Set(prev).add(placeId))
        await fetchItems()
      } catch (err: unknown) {
        setSearchError(err instanceof Error ? err.message : 'Request failed')
      } finally {
        setAddingPlaceId(null)
      }
    },
    [addingPlaceId, fetchItems, listId, searchTagInputs]
  )

  const handleClearTagFilters = useCallback(() => {
    setActiveTagFilters([])
  }, [])

  const handleClearTypeFilters = useCallback(() => {
    setActiveTypeFilters([])
  }, [])

  const handlePlaceSelect = useCallback(
    (placeId: string) => {
      router.push(`/?place=${encodeURIComponent(placeId)}`)
    },
    [router]
  )

  const handleTagsUpdate = useCallback(
    async (itemId: string, tags: string[]) => {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}/tags`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
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
        reconcileTagFilters(next)
        return next
      })
      return updatedTags
    },
    [listId, reconcileTagFilters]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Add places to this list
          </h3>
          <p className="text-xs text-gray-500">
            Search approved places and add tags at the same time.
          </p>
        </div>
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Search approved places"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchLoading ? (
          <p className="text-xs text-gray-500">Searching…</p>
        ) : null}
        {searchError ? (
          <p className="text-xs text-red-600">{searchError}</p>
        ) : null}
        {!searchLoading &&
        !searchError &&
        searchQuery.trim().length >= 2 &&
        !searchResults.length ? (
          <p className="text-xs text-gray-500">No matches yet.</p>
        ) : null}
        {searchResults.length ? (
          <div className="space-y-2" data-testid="local-search-results">
            {searchResults.map((result) => {
              const inList =
                addedResultIds.has(result.id) ||
                existingPlaceIds.has(result.id)
              const tagsInput = searchTagInputs[result.id] ?? ''
              return (
                <div
                  key={result.id}
                  className="rounded-md border border-gray-100 px-3 py-2 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {result.name ?? 'Untitled place'}
                      </p>
                      {result.display_address ? (
                        <p className="text-xs text-gray-500">
                          {result.display_address}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                      Approved
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs"
                      placeholder="Add tags (optional)"
                      value={tagsInput}
                      onChange={(e) =>
                        handleSearchTagChange(result.id, e.target.value)
                      }
                      disabled={inList}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPlace(result.id)}
                      disabled={inList || addingPlaceId === result.id}
                      className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 disabled:opacity-50"
                    >
                      {inList
                        ? 'Added'
                        : addingPlaceId === result.id
                          ? 'Adding…'
                          : 'Add'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      <ListDetailBody
        list={list}
        items={filteredItems}
        loading={loading}
        error={error}
        emptyLabel={
          activeTagFilters.length || activeTypeFilters.length
            ? 'No places match these filters.'
            : 'No places in this list yet.'
        }
        onPlaceSelect={handlePlaceSelect}
        availableTypes={distinctTypes}
        activeTypeFilters={activeTypeFilters}
        onTypeFilterToggle={handleTypeToggle}
        onClearTypeFilters={handleClearTypeFilters}
        availableTags={distinctTags}
        activeTagFilters={activeTagFilters}
        onTagFilterToggle={handleTagToggle}
        onClearTagFilters={handleClearTagFilters}
        onTagsUpdate={handleTagsUpdate}
      />
    </div>
  )
}
