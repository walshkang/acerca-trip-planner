'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/stitch/ListDetailBody'
import {
  distinctTypesFromItems,
  isCategoryEnum,
  type ListFilterFieldErrors,
} from '@/lib/lists/filters'
import { distinctTagsFromItems, normalizeTagList } from '@/lib/lists/tags'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import {
  CATEGORY_ENUM_VALUES,
  type CategoryEnum,
  type EnergyEnum,
} from '@/lib/types/enums'
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
import ImportWizard from '@/components/import/ImportWizard'

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
  /** Tags that would be merged from enrichment when adding with default API behavior */
  suggested_tags?: string[]
}

type FetchItemsOptions = {
  updateAppliedFilters?: boolean
  updateDraftFilters?: boolean
}

type Props = {
  listId: string
}

function defaultCategoryFromSearchResult(result: SearchResult): CategoryEnum {
  return isCategoryEnum(result.category) ? result.category : 'Activity'
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
  const { resolveCategoryEmoji } = useCategoryIconOverrides(listId)
  const [importOpen, setImportOpen] = useState(false)
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
  const [searchCategoryChoice, setSearchCategoryChoice] = useState<
    Record<string, CategoryEnum>
  >({})
  const [searchIncludedSuggestedTags, setSearchIncludedSuggestedTags] = useState<
    Record<string, string[]>
  >({})
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
    setSearchCategoryChoice({})
    setSearchIncludedSuggestedTags({})
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

  useEffect(() => {
    setSearchCategoryChoice((prev) => {
      const next = { ...prev }
      for (const r of searchResults) {
        if (next[r.id] === undefined) {
          next[r.id] = defaultCategoryFromSearchResult(r)
        }
      }
      return next
    })
  }, [searchResults])

  useEffect(() => {
    setSearchIncludedSuggestedTags((prev) => {
      const next = { ...prev }
      for (const r of searchResults) {
        if (next[r.id] === undefined) {
          next[r.id] = [...(r.suggested_tags ?? [])]
        }
      }
      return next
    })
  }, [searchResults])

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

  const handleSearchCategoryChange = useCallback(
    (placeId: string, category: CategoryEnum) => {
      setSearchCategoryChoice((prev) => ({ ...prev, [placeId]: category }))
    },
    []
  )

  const handleRemoveSuggestedSearchTag = useCallback(
    (placeId: string, tag: string) => {
      setSearchIncludedSuggestedTags((prev) => {
        const cur = prev[placeId]
        if (!cur?.length) return prev
        const filtered = cur.filter((t) => t !== tag)
        return { ...prev, [placeId]: filtered }
      })
    },
    []
  )

  const handleClearSuggestedSearchTags = useCallback((placeId: string) => {
    setSearchIncludedSuggestedTags((prev) => ({ ...prev, [placeId]: [] }))
  }, [])

  const handleAddPlace = useCallback(
    async (placeId: string) => {
      if (addingPlaceId) return
      setAddingPlaceId(placeId)
      setSearchError(null)
      try {
        const result = searchResults.find((r) => r.id === placeId)
        if (!result) {
          setSearchError('Place not found in search results')
          return
        }
        const chosen =
          searchCategoryChoice[placeId] ?? defaultCategoryFromSearchResult(result)
        const current = defaultCategoryFromSearchResult(result)
        if (chosen !== current) {
          const patchRes = await fetch(`/api/places/${placeId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ category: chosen }),
          })
          const patchJson = await patchRes.json().catch(() => ({}))
          if (!patchRes.ok) {
            setSearchError(patchJson?.error || `HTTP ${patchRes.status}`)
            return
          }
        }

        const tagsInput = searchTagInputs[placeId] ?? ''
        const suggested =
          searchIncludedSuggestedTags[placeId] ?? result.suggested_tags ?? []
        const manualTags = normalizeTagList(tagsInput) ?? []
        const mergedTags =
          normalizeTagList([...suggested, ...manualTags]) ?? []

        const payload: {
          place_id: string
          include_automatic_tags: boolean
          tags?: string
        } = {
          place_id: placeId,
          include_automatic_tags: false,
        }
        if (mergedTags.length) {
          payload.tags = mergedTags.join(', ')
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
    [
      addingPlaceId,
      listId,
      refreshAppliedItems,
      searchCategoryChoice,
      searchIncludedSuggestedTags,
      searchResults,
      searchTagInputs,
    ]
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Add places to this list
            </h3>
            <p className="text-xs text-gray-500">
              Search approved places, adjust type and suggested tags, then add
              optional tags of your own.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            Import CSV/JSON
          </button>
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
          <div
            className="space-y-2 px-3"
            data-testid="local-search-results"
          >
            {searchResults.map((result) => {
              const inList =
                addedResultIds.has(result.id) ||
                existingPlaceIds.has(result.id)
              const tagsInput = searchTagInputs[result.id] ?? ''
              const categoryChoice =
                searchCategoryChoice[result.id] ??
                defaultCategoryFromSearchResult(result)
              const suggestedIncluded =
                searchIncludedSuggestedTags[result.id] ??
                result.suggested_tags ??
                []
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
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-gray-600">
                      Place type
                    </p>
                    <div
                      className="flex flex-wrap gap-1.5"
                      data-testid="local-search-category-chips"
                    >
                      {CATEGORY_ENUM_VALUES.map((cat) => {
                        const selected = categoryChoice === cat
                        return (
                          <button
                            key={cat}
                            type="button"
                            disabled={inList}
                            aria-pressed={selected}
                            onClick={() =>
                              handleSearchCategoryChange(result.id, cat)
                            }
                            className={`rounded-md border px-2 py-0.5 text-[10px] transition disabled:opacity-50 ${
                              selected
                                ? 'border-gray-800 bg-gray-800 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span
                              aria-hidden
                              className="mr-0.5 inline-block text-xs leading-none"
                            >
                              {resolveCategoryEmoji(cat)}
                            </span>
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-medium text-gray-600">
                        Suggested tags
                      </p>
                      {suggestedIncluded.length ? (
                        <button
                          type="button"
                          disabled={inList}
                          onClick={() =>
                            handleClearSuggestedSearchTags(result.id)
                          }
                          className="text-[10px] text-gray-500 underline hover:text-gray-800 disabled:opacity-50"
                        >
                          Clear all suggested
                        </button>
                      ) : null}
                    </div>
                    {suggestedIncluded.length ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        data-testid="local-search-suggested-tags"
                      >
                        {suggestedIncluded.map((tag) => (
                          <span
                            key={`${result.id}-${tag}`}
                            className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-800"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                            <button
                              type="button"
                              disabled={inList}
                              onClick={() =>
                                handleRemoveSuggestedSearchTag(result.id, tag)
                              }
                              className="text-gray-500 hover:text-gray-900 disabled:opacity-50"
                              aria-label={`Remove suggested tag ${tag}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        No suggested tags for this place.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs"
                      placeholder="Your tags (optional)"
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

      <ImportWizard
        listId={listId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        tripStartDate={list?.start_date ?? null}
        tripEndDate={list?.end_date ?? null}
        onSuccess={() => void refreshAppliedItems()}
      />
    </div>
  )
}
