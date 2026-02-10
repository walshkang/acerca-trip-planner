'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'
import {
  distinctTypesFromItems,
  isCategoryEnum,
  type ListFilterFieldErrors,
} from '@/lib/lists/filters'
import { distinctTagsFromItems } from '@/lib/lists/tags'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import {
  areFiltersEqual,
  buildServerFiltersFromDraft,
  type CanonicalListFilters,
  emptyCanonicalFilters,
  isEnergyEnum,
  normalizeCanonicalFilters,
  normalizeFilterFieldErrors,
  sortCategories,
  sortEnergy,
  sortTags,
  uniqueStrings,
} from '@/lib/lists/filter-client'

type ItemsResponse = {
  list?: ListSummary | null
  items?: ListItemRow[]
  distinct_tags?: string[]
  canonicalFilters?: unknown
  code?: string
  message?: string
  error?: string
  fieldErrors?: unknown
}

type QueryFiltersResponse = {
  mode?: 'places' | 'list_items'
  list?: ListSummary | null
  items?: ListItemRow[]
  canonicalFilters?: unknown
  code?: string
  message?: string
  error?: string
  fieldErrors?: unknown
}

type TranslateFiltersResponse = {
  canonicalFilters?: unknown
  hasAny?: boolean
  model?: string
  promptVersion?: string
  usedFallback?: boolean
  code?: string
  message?: string
  error?: string
  fieldErrors?: unknown
}

type SearchResult = {
  id: string
  name: string | null
  category: string
  display_address: string | null
}

type FetchItemsOptions = {
  updateAppliedFilters?: boolean
  updateDraftFilters?: boolean
}

type Props = {
  listId: string
}

function buildItemsUrl(listId: string, filters: CanonicalListFilters): string {
  const searchParams = new URLSearchParams({ limit: '200' })

  for (const category of filters.categories) {
    searchParams.append('categories', category)
  }

  for (const tag of filters.tags) {
    searchParams.append('tags', tag)
  }

  if (filters.scheduled_date) {
    searchParams.set('scheduled_date', filters.scheduled_date)
  }

  if (filters.slot) {
    searchParams.set('slot', filters.slot)
  }

  return `/api/lists/${listId}/items?${searchParams.toString()}`
}

function hasAnyFilters(filters: CanonicalListFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.energy.length > 0 ||
    filters.open_now !== null ||
    filters.scheduled_date !== null ||
    filters.slot !== null
  )
}

function placeIdsFromItems(items: ListItemRow[]): string[] {
  return items
    .map((item) => item.place?.id)
    .filter((id): id is string => Boolean(id))
}

export default function ListDetailPanel({ listId }: Props) {
  const router = useRouter()
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [distinctTags, setDistinctTags] = useState<string[]>([])
  const [distinctTypes, setDistinctTypes] = useState<CategoryEnum[]>([])
  const [allPlaceIds, setAllPlaceIds] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<CanonicalListFilters>(() =>
    emptyCanonicalFilters()
  )
  const [draftFilters, setDraftFilters] = useState<CanonicalListFilters>(() =>
    emptyCanonicalFilters()
  )
  const [undoFilters, setUndoFilters] = useState<CanonicalListFilters | null>(null)
  const [filterFieldErrors, setFilterFieldErrors] =
    useState<ListFilterFieldErrors | null>(null)
  const [filterErrorMessage, setFilterErrorMessage] = useState<string | null>(
    null
  )
  const [filterIntent, setFilterIntent] = useState('')
  const [translateErrorMessage, setTranslateErrorMessage] = useState<string | null>(
    null
  )
  const [translateHint, setTranslateHint] = useState<string | null>(null)
  const [translatingFilters, setTranslatingFilters] = useState(false)
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

  const appliedFiltersRef = useRef(appliedFilters)
  const requestSequenceRef = useRef(0)
  const activeRequestRef = useRef<{
    requestId: number
    controller: AbortController
  } | null>(null)

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters
  }, [appliedFilters])

  const beginItemsRequest = useCallback(() => {
    const requestId = requestSequenceRef.current + 1
    requestSequenceRef.current = requestId
    activeRequestRef.current?.controller.abort()
    const controller = new AbortController()
    activeRequestRef.current = { requestId, controller }
    setLoading(true)
    setError(null)
    return { requestId, signal: controller.signal }
  }, [])

  const isStaleItemsRequest = useCallback(
    (requestId: number, signal: AbortSignal) =>
      signal.aborted || activeRequestRef.current?.requestId !== requestId,
    []
  )

  const finishItemsRequest = useCallback((requestId: number) => {
    if (activeRequestRef.current?.requestId !== requestId) return
    activeRequestRef.current = null
    setLoading(false)
  }, [])

  useEffect(
    () => () => {
      activeRequestRef.current?.controller.abort()
      activeRequestRef.current = null
    },
    []
  )

  const fetchItems = useCallback(
    async (
      filters: CanonicalListFilters,
      options: FetchItemsOptions = {}
    ): Promise<boolean> => {
      const {
        updateAppliedFilters = true,
        updateDraftFilters = false,
      } = options
      const { requestId, signal } = beginItemsRequest()
      try {
        const res = await fetch(buildItemsUrl(listId, filters), { signal })
        const json = (await res.json().catch(() => ({}))) as Partial<ItemsResponse>
        if (isStaleItemsRequest(requestId, signal)) return false
        if (!res.ok) {
          const responseMessage = json?.message || json?.error || `HTTP ${res.status}`
          setError(responseMessage)
          if (json?.code === 'invalid_filter_payload') {
            setFilterErrorMessage(responseMessage)
            setFilterFieldErrors(
              normalizeFilterFieldErrors(json?.fieldErrors) ?? {
                payload: [responseMessage],
              }
            )
          } else {
            setFilterErrorMessage(null)
            setFilterFieldErrors(null)
          }
          return false
        }

        const canonicalFilters = normalizeCanonicalFilters(
          json?.canonicalFilters ?? filters
        )
        const nextItems = (json?.items ?? []) as ListItemRow[]

        setList((json?.list ?? null) as ListSummary | null)
        setItems(nextItems)
        setDistinctTags(
          Array.isArray(json?.distinct_tags)
            ? sortTags(
                uniqueStrings(
                  json.distinct_tags.filter(
                    (value): value is string => typeof value === 'string'
                  )
                )
              )
            : distinctTagsFromItems(nextItems)
        )
        setDistinctTypes(distinctTypesFromItems(nextItems))
        if (!hasAnyFilters(canonicalFilters)) {
          setAllPlaceIds(placeIdsFromItems(nextItems))
        }
        setFilterFieldErrors(null)
        setFilterErrorMessage(null)
        setTranslateErrorMessage(null)

        if (updateAppliedFilters) {
          setAppliedFilters(canonicalFilters)
        }
        if (updateDraftFilters) {
          setDraftFilters(canonicalFilters)
        }

        return true
      } catch (e: unknown) {
        if (
          (e as { name?: string })?.name === 'AbortError' ||
          isStaleItemsRequest(requestId, signal)
        ) {
          return false
        }
        const message = e instanceof Error ? e.message : 'Request failed'
        setError(message)
        return false
      } finally {
        finishItemsRequest(requestId)
      }
    },
    [beginItemsRequest, finishItemsRequest, isStaleItemsRequest, listId]
  )

  const fetchItemsViaQuery = useCallback(
    async (
      filters: unknown,
      options: FetchItemsOptions = {}
    ): Promise<boolean> => {
      const {
        updateAppliedFilters = true,
        updateDraftFilters = false,
      } = options

      const { requestId, signal } = beginItemsRequest()

      try {
        const res = await fetch('/api/filters/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            list_id: listId,
            filters,
            limit: 200,
          }),
          signal,
        })
        const json = (await res.json().catch(() => ({}))) as Partial<QueryFiltersResponse>
        if (isStaleItemsRequest(requestId, signal)) return false

        if (!res.ok) {
          const responseMessage = json?.message || json?.error || `HTTP ${res.status}`
          setError(responseMessage)
          if (json?.code === 'invalid_filter_payload') {
            setFilterErrorMessage(responseMessage)
            setFilterFieldErrors(
              normalizeFilterFieldErrors(json?.fieldErrors) ?? {
                payload: [responseMessage],
              }
            )
          } else {
            setFilterErrorMessage(null)
            setFilterFieldErrors(null)
          }
          return false
        }

        const nextItems = (json?.items ?? []) as ListItemRow[]
        const canonicalFilters = normalizeCanonicalFilters(json?.canonicalFilters ?? {})
        if (Object.prototype.hasOwnProperty.call(json, 'list')) {
          setList((json?.list ?? null) as ListSummary | null)
        }
        setItems(nextItems)
        setDistinctTags(distinctTagsFromItems(nextItems))
        setDistinctTypes(distinctTypesFromItems(nextItems))
        setFilterFieldErrors(null)
        setFilterErrorMessage(null)
        setTranslateErrorMessage(null)

        if (updateAppliedFilters) {
          setAppliedFilters(canonicalFilters)
        }
        if (updateDraftFilters) {
          setDraftFilters(canonicalFilters)
        }

        return true
      } catch (e: unknown) {
        if (
          (e as { name?: string })?.name === 'AbortError' ||
          isStaleItemsRequest(requestId, signal)
        ) {
          return false
        }
        const message = e instanceof Error ? e.message : 'Request failed'
        setError(message)
        return false
      } finally {
        finishItemsRequest(requestId)
      }
    },
    [beginItemsRequest, finishItemsRequest, isStaleItemsRequest, listId]
  )

  const refreshAppliedItems = useCallback(async () => {
    const currentFilters = appliedFiltersRef.current
    if (hasAnyFilters(currentFilters)) {
      await fetchItemsViaQuery(buildServerFiltersFromDraft(currentFilters), {
        updateAppliedFilters: true,
        updateDraftFilters: false,
      })
      return
    }
    await fetchItems(currentFilters, {
      updateAppliedFilters: true,
      updateDraftFilters: false,
    })
  }, [fetchItems, fetchItemsViaQuery])

  useEffect(() => {
    activeRequestRef.current?.controller.abort()
    activeRequestRef.current = null
    setLoading(false)
    const nextFilters = emptyCanonicalFilters()
    setList(null)
    setItems([])
    setDistinctTags([])
    setDistinctTypes([])
    setAllPlaceIds([])
    setAppliedFilters(nextFilters)
    setDraftFilters(nextFilters)
    setUndoFilters(null)
    setFilterFieldErrors(null)
    setFilterErrorMessage(null)
    setFilterIntent('')
    setTranslateErrorMessage(null)
    setTranslateHint(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchLoading(false)
    setSearchError(null)
    setSearchTagInputs({})
    setAddedResultIds(new Set())

    void fetchItems(nextFilters, {
      updateAppliedFilters: true,
      updateDraftFilters: true,
    })
  }, [fetchItems, listId])

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

  const availableTags = useMemo(
    () =>
      sortTags(
        uniqueStrings([...distinctTags, ...draftFilters.tags, ...appliedFilters.tags])
      ),
    [appliedFilters.tags, distinctTags, draftFilters.tags]
  )

  const availableTypes = useMemo(() => {
    const merged = uniqueStrings([
      ...distinctTypes,
      ...draftFilters.categories,
      ...appliedFilters.categories,
    ]).filter((value): value is CategoryEnum => isCategoryEnum(value))
    return sortCategories(merged)
  }, [appliedFilters.categories, distinctTypes, draftFilters.categories])

  const existingPlaceIds = useMemo(() => {
    return new Set([...allPlaceIds, ...placeIdsFromItems(items)])
  }, [allPlaceIds, items])

  const applyFiltersImmediately = useCallback(
    async (nextFilters: CanonicalListFilters) => {
      const previous = appliedFiltersRef.current
      if (areFiltersEqual(nextFilters, previous)) return

      setTranslateErrorMessage(null)
      setTranslateHint(null)
      setFilterFieldErrors(null)
      setFilterErrorMessage(null)
      setError(null)

      const ok = await fetchItemsViaQuery(buildServerFiltersFromDraft(nextFilters), {
        updateAppliedFilters: true,
        updateDraftFilters: true,
      })
      if (ok) {
        setUndoFilters(previous)
      }
    },
    [fetchItemsViaQuery]
  )

  const handleTagToggle = useCallback(
    (tag: string) => {
      const current = appliedFiltersRef.current
      const nextTags = current.tags.includes(tag)
        ? current.tags.filter((value) => value !== tag)
        : [...current.tags, tag]
      const nextFilters: CanonicalListFilters = {
        ...current,
        tags: sortTags(uniqueStrings(nextTags)),
      }
      void applyFiltersImmediately(nextFilters)
    },
    [applyFiltersImmediately]
  )

  const handleTypeToggle = useCallback(
    (type: CategoryEnum) => {
      const current = appliedFiltersRef.current
      const nextCategories = current.categories.includes(type)
        ? current.categories.filter((value) => value !== type)
        : [...current.categories, type]
      const nextFilters: CanonicalListFilters = {
        ...current,
        categories: sortCategories(
          uniqueStrings(nextCategories).filter((value): value is CategoryEnum =>
            isCategoryEnum(value)
          )
        ),
      }
      void applyFiltersImmediately(nextFilters)
    },
    [applyFiltersImmediately]
  )

  const handleEnergyToggle = useCallback(
    (energy: EnergyEnum) => {
      const current = appliedFiltersRef.current
      const nextEnergy = current.energy.includes(energy)
        ? current.energy.filter((value) => value !== energy)
        : [...current.energy, energy]
      const nextFilters: CanonicalListFilters = {
        ...current,
        energy: sortEnergy(
          uniqueStrings(nextEnergy).filter((value): value is EnergyEnum =>
            isEnergyEnum(value)
          )
        ),
      }
      void applyFiltersImmediately(nextFilters)
    },
    [applyFiltersImmediately]
  )

  const handleOpenNowFilterChange = useCallback(
    (nextValue: boolean | null) => {
      const current = appliedFiltersRef.current
      if (current.open_now === nextValue) return
      const nextFilters: CanonicalListFilters = {
        ...current,
        open_now: nextValue,
      }
      void applyFiltersImmediately(nextFilters)
    },
    [applyFiltersImmediately]
  )

  const handleClearTagFilters = useCallback(() => {
    const current = appliedFiltersRef.current
    const nextFilters: CanonicalListFilters = {
      ...current,
      tags: [],
    }
    void applyFiltersImmediately(nextFilters)
  }, [applyFiltersImmediately])

  const handleClearTypeFilters = useCallback(() => {
    const current = appliedFiltersRef.current
    const nextFilters: CanonicalListFilters = {
      ...current,
      categories: [],
    }
    void applyFiltersImmediately(nextFilters)
  }, [applyFiltersImmediately])

  const handleClearAllFilters = useCallback(() => {
    const current = appliedFiltersRef.current
    const nextFilters: CanonicalListFilters = {
      ...current,
      categories: [],
      tags: [],
      scheduled_date: null,
      slot: null,
      energy: [],
      open_now: null,
    }
    void applyFiltersImmediately(nextFilters)
  }, [applyFiltersImmediately])

  const handleResetFilters = useCallback(async () => {
    if (!undoFilters) return
    const target = undoFilters
    const current = appliedFiltersRef.current
    setTranslateErrorMessage(null)
    setTranslateHint(null)
    setFilterFieldErrors(null)
    setFilterErrorMessage(null)
    setError(null)

    const ok = await fetchItemsViaQuery(buildServerFiltersFromDraft(target), {
      updateAppliedFilters: true,
      updateDraftFilters: true,
    })
    if (ok) {
      setUndoFilters(current)
    }
  }, [fetchItemsViaQuery, undoFilters])

  const handleTranslateIntent = useCallback(async () => {
    const intent = filterIntent.trim()
    if (!intent) return

    setTranslatingFilters(true)
    setTranslateErrorMessage(null)
    setFilterErrorMessage(null)
    setFilterFieldErrors(null)

    try {
      const translateRes = await fetch('/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent,
          list_id: listId,
        }),
      })
      const translateJson = (await translateRes
        .json()
        .catch(() => ({}))) as Partial<TranslateFiltersResponse>

      if (!translateRes.ok) {
        const message =
          translateJson?.message || translateJson?.error || `HTTP ${translateRes.status}`
        setTranslateErrorMessage(message)
        if (translateJson?.code === 'invalid_filter_payload') {
          setFilterErrorMessage(message)
          setFilterFieldErrors(
            normalizeFilterFieldErrors(translateJson?.fieldErrors) ?? {
              payload: [message],
            }
          )
        }
        return
      }

      const previous = appliedFiltersRef.current
      const applyOk = await fetchItemsViaQuery(
        translateJson?.canonicalFilters ?? {},
        {
          updateAppliedFilters: true,
          updateDraftFilters: true,
        }
      )
      if (!applyOk) return
      setUndoFilters(previous)

      const usedFallback = translateJson?.usedFallback === true
      const model =
        typeof translateJson?.model === 'string' && translateJson.model.length
          ? translateJson.model
          : null
      if (usedFallback) {
        setTranslateHint('Interpreted with deterministic fallback rules.')
      } else if (model) {
        setTranslateHint(`Interpreted with ${model}.`)
      } else {
        setTranslateHint('Filters interpreted successfully.')
      }
    } catch (e: unknown) {
      setTranslateErrorMessage(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setTranslatingFilters(false)
    }
  }, [fetchItemsViaQuery, filterIntent, listId])

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
        setAllPlaceIds((prev) =>
          prev.includes(placeId) ? prev : [...prev, placeId]
        )
        await refreshAppliedItems()
      } catch (err: unknown) {
        setSearchError(err instanceof Error ? err.message : 'Request failed')
      } finally {
        setAddingPlaceId(null)
      }
    },
    [addingPlaceId, listId, refreshAppliedItems, searchTagInputs]
  )

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
        setDistinctTags(distinctTagsFromItems(next))
        return next
      })
      void refreshAppliedItems()
      return updatedTags
    },
    [listId, refreshAppliedItems]
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
          <p className="text-xs text-gray-500">Searching...</p>
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
                          ? 'Adding...'
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
        items={items}
        loading={loading}
        error={error}
        emptyLabel={
          appliedFilters.tags.length ||
          appliedFilters.categories.length ||
          appliedFilters.energy.length ||
          appliedFilters.open_now !== null ||
          appliedFilters.scheduled_date ||
          appliedFilters.slot
            ? 'No places match these filters.'
            : 'No places in this list yet.'
        }
        onPlaceSelect={handlePlaceSelect}
        availableTypes={availableTypes}
        activeTypeFilters={appliedFilters.categories}
        appliedTypeFilters={appliedFilters.categories}
        onTypeFilterToggle={handleTypeToggle}
        onClearTypeFilters={handleClearTypeFilters}
        availableTags={availableTags}
        activeTagFilters={appliedFilters.tags}
        appliedTagFilters={appliedFilters.tags}
        onTagFilterToggle={handleTagToggle}
        onClearTagFilters={handleClearTagFilters}
        onClearAllFilters={handleClearAllFilters}
        activeEnergyFilters={appliedFilters.energy}
        openNowFilter={appliedFilters.open_now}
        onEnergyFilterToggle={handleEnergyToggle}
        onSetOpenNowFilter={handleOpenNowFilterChange}
        onResetFilters={handleResetFilters}
        isFilterDirty={false}
        isApplyingFilters={loading || translatingFilters}
        resetDisabled={!undoFilters || loading || translatingFilters}
        filterFieldErrors={filterFieldErrors}
        filterErrorMessage={filterErrorMessage}
        filterIntent={filterIntent}
        onFilterIntentChange={(next) => {
          setFilterIntent(next)
          setTranslateErrorMessage(null)
          setTranslateHint(null)
        }}
        onTranslateIntent={handleTranslateIntent}
        isTranslatingIntent={translatingFilters}
        translateIntentDisabled={translatingFilters || !filterIntent.trim().length}
        translateIntentError={translateErrorMessage}
        translateIntentHint={translateHint}
        onTagsUpdate={handleTagsUpdate}
      />
    </div>
  )
}
