'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ListDetailBody, {
  ListItemRow,
  ListSummary,
} from '@/components/lists/ListDetailBody'
import {
  distinctTypesFromItems,
  isCategoryEnum,
  type ListFilterFieldErrors,
} from '@/lib/lists/filters'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import { distinctTagsFromItems } from '@/lib/lists/tags'
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

type Props = {
  open: boolean
  onClose: () => void
  activeListId: string | null
  onActiveListChange: (id: string | null) => void
  onPlaceIdsChange: (placeIds: string[]) => void
  onActiveTypeFiltersChange?: (types: CategoryEnum[]) => void
  onPlaceSelect: (placeId: string) => void
  onActiveListItemsChange?: (
    items: Array<{
      id: string
      list_id: string
      place_id: string
      tags: string[]
      scheduled_date: string | null
      scheduled_start_time: string | null
      completed_at: string | null
    }>
  ) => void
  focusedPlaceId?: string | null
  tagsRefreshKey?: number
  itemsRefreshKey?: number
  onTagsUpdated?: () => void
  variant?: 'floating' | 'embedded'
  tone?: 'light' | 'dark'
}

type ListsResponse = {
  lists: ListSummary[]
  error?: string
}

type ItemsResponse = {
  list: ListSummary
  items: ListItemRow[]
  distinct_tags?: string[]
  canonicalFilters?: unknown
  code?: string
  message?: string
  error?: string
  fieldErrors?: unknown
  lastValidCanonicalFilters?: unknown
}

type FetchItemsOptions = {
  updateAppliedFilters?: boolean
  updateDraftFilters?: boolean
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
  lastValidCanonicalFilters?: unknown
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

function hasServerOnlyFilters(filters: CanonicalListFilters): boolean {
  return filters.energy.length > 0 || filters.open_now !== null
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
  itemsRefreshKey,
  onTagsUpdated,
  variant = 'floating',
  tone = 'dark',
}: Props) {
  const [lists, setLists] = useState<ListSummary[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [activeList, setActiveList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [distinctTags, setDistinctTags] = useState<string[]>([])
  const [distinctTypes, setDistinctTypes] = useState<CategoryEnum[]>([])
  const [appliedFilters, setAppliedFilters] = useState<CanonicalListFilters>(
    () => emptyCanonicalFilters()
  )
  const [draftFilters, setDraftFilters] = useState<CanonicalListFilters>(() =>
    emptyCanonicalFilters()
  )
  const [undoFilters, setUndoFilters] = useState<CanonicalListFilters | null>(null)
  const [filterFieldErrors, setFilterFieldErrors] =
    useState<ListFilterFieldErrors | null>(null)
  const [filterErrorMessage, setFilterErrorMessage] = useState<string | null>(null)
  const [filterIntent, setFilterIntent] = useState('')
  const [translateErrorMessage, setTranslateErrorMessage] = useState<string | null>(
    null
  )
  const [translateHint, setTranslateHint] = useState<string | null>(null)
  const [translatingFilters, setTranslatingFilters] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

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
    setItemsLoading(true)
    setItemsError(null)
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
    setItemsLoading(false)
  }, [])

  useEffect(
    () => () => {
      activeRequestRef.current?.controller.abort()
      activeRequestRef.current = null
    },
    []
  )

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
    async (
      listId: string,
      filters: CanonicalListFilters,
      options: FetchItemsOptions = {}
    ) => {
      const {
        updateAppliedFilters = true,
        updateDraftFilters = false,
      } = options
      const { requestId, signal } = beginItemsRequest()
      try {
        const url = buildItemsUrl(listId, filters)
        const res = await fetch(url, { signal })
        const json = (await res.json().catch(() => ({}))) as Partial<ItemsResponse>
        if (isStaleItemsRequest(requestId, signal)) return false
        if (!res.ok) {
          const responseMessage = json?.message || json?.error || `HTTP ${res.status}`
          setItemsError(responseMessage)
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

        setActiveList((json?.list ?? null) as ListSummary | null)
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
        setItemsError(message)
        return false
      } finally {
        finishItemsRequest(requestId)
      }
    },
    [beginItemsRequest, finishItemsRequest, isStaleItemsRequest]
  )

  const fetchItemsViaQuery = useCallback(
    async (
      listId: string,
      filters: unknown,
      options: FetchItemsOptions = {}
    ) => {
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
          setItemsError(responseMessage)
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
          setActiveList((json?.list ?? null) as ListSummary | null)
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
      } catch (error: unknown) {
        if (
          (error as { name?: string })?.name === 'AbortError' ||
          isStaleItemsRequest(requestId, signal)
        ) {
          return false
        }
        const message = error instanceof Error ? error.message : 'Request failed'
        setItemsError(message)
        return false
      } finally {
        finishItemsRequest(requestId)
      }
    },
    [beginItemsRequest, finishItemsRequest, isStaleItemsRequest]
  )

  const refreshAppliedItems = useCallback(async () => {
    if (!activeListId) return
    const current = appliedFiltersRef.current
    if (hasServerOnlyFilters(current)) {
      await fetchItemsViaQuery(activeListId, buildServerFiltersFromDraft(current), {
        updateAppliedFilters: true,
        updateDraftFilters: false,
      })
      return
    }
    await fetchItems(activeListId, current, {
      updateAppliedFilters: true,
      updateDraftFilters: false,
    })
  }, [activeListId, fetchItems, fetchItemsViaQuery])

  useEffect(() => {
    if (!open) return
    void fetchLists()
  }, [fetchLists, open])

  useEffect(() => {
    if (!activeListId) {
      activeRequestRef.current?.controller.abort()
      activeRequestRef.current = null
      setItemsLoading(false)
      setActiveList(null)
      setItems([])
      setDistinctTags([])
      setDistinctTypes([])
      setAppliedFilters(emptyCanonicalFilters())
      setDraftFilters(emptyCanonicalFilters())
      setUndoFilters(null)
      setFilterFieldErrors(null)
      setFilterErrorMessage(null)
      setFilterIntent('')
      setTranslateErrorMessage(null)
      setTranslateHint(null)
      onPlaceIdsChange([])
      return
    }

    const nextFilters = emptyCanonicalFilters()
    setFilterFieldErrors(null)
    setFilterErrorMessage(null)
    setFilterIntent('')
    setTranslateErrorMessage(null)
    setTranslateHint(null)
    setAppliedFilters(nextFilters)
    setDraftFilters(nextFilters)
    setUndoFilters(null)
    void fetchItems(activeListId, nextFilters, {
      updateAppliedFilters: true,
      updateDraftFilters: true,
    })
  }, [activeListId, fetchItems, onPlaceIdsChange])

  useEffect(() => {
    if (!activeListId) return
    void refreshAppliedItems()
  }, [activeListId, itemsRefreshKey, refreshAppliedItems, tagsRefreshKey])

  useEffect(() => {
    if (!open || !activeListId) return
    void refreshAppliedItems()
  }, [activeListId, open, refreshAppliedItems])

  useEffect(() => {
    onActiveTypeFiltersChange?.(appliedFilters.categories)
  }, [appliedFilters.categories, onActiveTypeFiltersChange])

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
        scheduled_date: item.scheduled_date ?? null,
        scheduled_start_time: item.scheduled_start_time ?? null,
        completed_at: item.completed_at ?? null,
      }))
      .filter((item): item is {
        id: string
        list_id: string
        place_id: string
        tags: string[]
        scheduled_date: string | null
        scheduled_start_time: string | null
        completed_at: string | null
      } =>
        Boolean(item.place_id)
      )
    onActiveListItemsChange?.(mapped)
  }, [activeListId, items, onActiveListItemsChange])

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

  const applyFiltersImmediately = useCallback(
    async (nextFilters: CanonicalListFilters) => {
      if (!activeListId) return
      const previous = appliedFiltersRef.current
      if (areFiltersEqual(nextFilters, previous)) return

      setTranslateErrorMessage(null)
      setTranslateHint(null)
      setFilterFieldErrors(null)
      setFilterErrorMessage(null)
      setItemsError(null)

      const ok = await fetchItemsViaQuery(
        activeListId,
        buildServerFiltersFromDraft(nextFilters),
        {
          updateAppliedFilters: true,
          updateDraftFilters: true,
        }
      )
      if (ok) {
        setUndoFilters(previous)
      }
    },
    [activeListId, fetchItemsViaQuery]
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
    if (!activeListId || !undoFilters) return
    const target = undoFilters
    const current = appliedFiltersRef.current
    setTranslateErrorMessage(null)
    setTranslateHint(null)
    setFilterFieldErrors(null)
    setFilterErrorMessage(null)
    setItemsError(null)

    const ok = await fetchItemsViaQuery(
      activeListId,
      buildServerFiltersFromDraft(target),
      {
        updateAppliedFilters: true,
        updateDraftFilters: true,
      }
    )
    if (ok) {
      setUndoFilters(current)
    }
  }, [activeListId, fetchItemsViaQuery, undoFilters])

  const handleTranslateIntent = useCallback(async () => {
    if (!activeListId) return
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
          list_id: activeListId,
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
        activeListId,
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
    } catch (error: unknown) {
      setTranslateErrorMessage(
        error instanceof Error ? error.message : 'Request failed'
      )
    } finally {
      setTranslatingFilters(false)
    }
  }, [activeListId, fetchItemsViaQuery, filterIntent])

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
        setDistinctTags(distinctTagsFromItems(next))
        return next
      })
      onTagsUpdated?.()
      void refreshAppliedItems()
      return updatedTags
    },
    [activeListId, onTagsUpdated, refreshAppliedItems]
  )

  if (!open) return null

  const isEmbedded = variant === 'embedded'
  const isDark = tone === 'dark'
  const rootTextClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const borderClass = isDark ? 'border-white/10' : 'border-slate-300/60'
  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const subtitleClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const actionClass = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'
  const helperClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'
  const selectedChipClass = isDark
    ? 'border-slate-100 bg-slate-100 text-slate-900'
    : 'border-slate-900 bg-slate-900 text-slate-50'
  const unselectedChipClass = isDark
    ? 'border-white/10 text-slate-200 hover:border-white/30'
    : 'border-slate-300 text-slate-700 hover:border-slate-500'

  return (
    <aside
      className={
        isEmbedded
          ? rootTextClass
          : `glass-panel absolute left-4 top-20 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl ${rootTextClass}`
      }
      data-testid="list-drawer"
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${borderClass}`}
      >
        <div>
          <h2 className={`text-sm font-semibold ${titleClass}`}>Lists</h2>
          <p className={`text-xs ${subtitleClass}`}>Keep the map in view.</p>
        </div>
        <div className="flex items-center gap-2">
          {isEmbedded ? null : (
            <>
              <button
                type="button"
                onClick={() => onActiveListChange(null)}
                className={`text-xs ${actionClass}`}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`text-xs ${actionClass}`}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`border-b px-4 py-3 space-y-2 ${borderClass}`}>
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
          <p className={`text-xs ${helperClass}`}>Loading lists…</p>
        ) : null}
        {listsError ? (
          <p className={`text-xs ${errorClass}`}>{listsError}</p>
        ) : null}
        {!listsLoading && !lists.length ? (
          <p className={`text-xs ${helperClass}`}>No lists yet.</p>
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
                    ? selectedChipClass
                    : unselectedChipClass
                }`}
              >
                {list.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        <ListDetailBody
          list={activeList}
          items={items}
          loading={itemsLoading}
          error={itemsError}
          emptyLabel={
            activeList
              ? appliedFilters.tags.length ||
                appliedFilters.categories.length ||
                appliedFilters.energy.length ||
                appliedFilters.open_now !== null
                ? 'No places match these filters.'
                : 'No places in this list yet.'
              : 'Select a list to see its places.'
          }
          onPlaceSelect={onPlaceSelect}
          focusedPlaceId={focusedPlaceId}
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
          isApplyingFilters={itemsLoading || translatingFilters}
          resetDisabled={!undoFilters || itemsLoading || translatingFilters}
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
          translateIntentDisabled={
            !activeListId || translatingFilters || !filterIntent.trim().length
          }
          translateIntentError={translateErrorMessage}
          translateIntentHint={translateHint}
          onTagsUpdate={handleTagsUpdate}
          tone={tone}
        />
      </div>
    </aside>
  )
}
