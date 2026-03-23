'use client'

import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import type { CategoryEnum } from '@/lib/types/enums'
import type { ListItemRow, ListSummary } from '@/components/stitch/ListDetailBody'
import {
  type PlannerSlot,
  countIsoDatesInclusive,
  enumerateIsoDatesInclusive,
  fractionalOrderBetween,
  isoDateInTimezone,
  scheduledStartTimeFromSlot,
  slotFromScheduledStartTime,
} from '@/lib/lists/planner'
import PlannerTripDates from './planner/PlannerTripDates'
import PlannerDayGrid from './planner/PlannerDayGrid'
import PlannerDayDetail from './planner/PlannerDayDetail'
import PlannerBacklog from './planner/PlannerBacklog'
import PlannerMovePicker from './planner/PlannerMovePicker'
import { formatDayLabelFull } from './planner/planner-utils'
import { useTripStore } from '@/lib/state/useTripStore'

type Props = {
  listId: string | null
  onPlaceSelect?: (placeId: string) => void
  onPlanMutated?: () => void
  tone?: 'light' | 'dark'
  layout?: 'column' | 'split'
}

type ItemsResponse = {
  list: ListSummary
  items: ListItemRow[]
  error?: string
}

type MoveDestination =
  | { type: 'backlog' }
  | { type: 'done' }
  | { type: 'slot'; date: string; slot: PlannerSlot }

type ScheduleSource = 'tap_move' | 'drag'

const MAX_TRIP_DAYS_RENDER = 21

const EMPTY_SCHEDULED_DAY_ITEMS: ListItemRow[] = []

function sortByCreatedAtAsc(a: { created_at: string }, b: { created_at: string }) {
  return a.created_at.localeCompare(b.created_at)
}

function sortByScheduledOrder(a: ListItemRow, b: ListItemRow) {
  const ao = typeof a.scheduled_order === 'number' ? a.scheduled_order : 0
  const bo = typeof b.scheduled_order === 'number' ? b.scheduled_order : 0
  if (ao !== bo) return ao - bo
  return a.created_at.localeCompare(b.created_at)
}

function orderValue(row: ListItemRow) {
  return typeof row.scheduled_order === 'number' ? row.scheduled_order : 0
}

export default function ListPlanner({
  listId,
  onPlaceSelect,
  onPlanMutated,
  tone = 'dark',
  layout = 'column',
}: Props) {
  const isSplit = layout === 'split'
  const isDark = tone === 'dark'
  const { resolveCategoryEmoji: resolveCategoryEmojiTyped } = useCategoryIconOverrides(listId)
  const resolveCategoryEmoji = useCallback(
    (category: string) => resolveCategoryEmojiTyped(category as CategoryEnum),
    [resolveCategoryEmojiTyped]
  )
  const plannerToneClass = isDark ? '' : 'planner-light'

  // ── Data state ──
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Trip date editing ──
  const [editingTripDates, setEditingTripDates] = useState(false)
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [tripTimezone, setTripTimezone] = useState('')
  const [savingTripDates, setSavingTripDates] = useState(false)

  // ── Move / drag state ──
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const [canDrag, setCanDrag] = useState(false)

  // ── Day grid state ──
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  /** Keep Zustand in sync without a useEffect (effect + subscriber caused max update depth). */
  const setSelectedDayAndStore = useCallback((day: string | null) => {
    setSelectedDay(day)
    useTripStore.getState().setPlannerSelectedDay(day)
  }, [])
  const plannerSelectedDayFromStore = useTripStore((s) => s.plannerSelectedDay)
  const focusedPlannerPlaceId = useTripStore((s) => s.focusedPlannerPlaceId)
  const [doneCollapsed, setDoneCollapsed] = useState(true)

  // ── Derived data ──
  const tripRange = useMemo(() => {
    if (!list?.start_date || !list?.end_date) return null
    return { start: list.start_date, end: list.end_date }
  }, [list?.end_date, list?.start_date])

  const tripDaysCount = useMemo(() => {
    if (!tripRange) return null
    return countIsoDatesInclusive(tripRange.start, tripRange.end)
  }, [tripRange])

  const tripDates = useMemo(() => {
    if (!tripRange) return null
    if (!tripDaysCount) return null
    if (tripDaysCount > MAX_TRIP_DAYS_RENDER) return null
    return enumerateIsoDatesInclusive(tripRange.start, tripRange.end)
  }, [tripDaysCount, tripRange])

  /** Stable key so store-sync effect does not re-run on a new tripDates array with the same dates. */
  const tripDatesKey = useMemo(
    () => (tripDates?.join('\0') ?? ''),
    [tripDates]
  )
  const tripDatesRef = useRef(tripDates)
  tripDatesRef.current = tripDates

  const todayIso = useMemo(
    () => isoDateInTimezone(list?.timezone ?? null),
    [list?.timezone]
  )

  const movingItem = useMemo(() => {
    if (!moveItemId) return null
    return items.find((item) => item.id === moveItemId) ?? null
  }, [items, moveItemId])

  const backlogItems = useMemo(() => {
    const backlog = items
      .filter((item) => Boolean(item.place) && !item.completed_at && !item.scheduled_date)
      .slice()
      .sort(sortByCreatedAtAsc)
    // Also include items scheduled outside trip range, shown with a warning
    if (tripRange) {
      const outside = items.filter((item) => {
        if (!item.place || item.completed_at || !item.scheduled_date) return false
        return item.scheduled_date < tripRange.start || item.scheduled_date > tripRange.end
      })
      if (outside.length) {
        return [...backlog, ...outside.sort(sortByScheduledOrder)]
      }
    }
    return backlog
  }, [items, tripRange])

  const doneItems = useMemo(() => {
    return items
      .filter((item) => Boolean(item.place) && Boolean(item.completed_at))
      .slice()
      .sort((a, b) => {
        const ad = a.completed_at ?? ''
        const bd = b.completed_at ?? ''
        if (ad !== bd) return bd.localeCompare(ad)
        return a.created_at.localeCompare(b.created_at)
      })
  }, [items])

  const scheduledItemsByDate = useMemo(() => {
    const map = new Map<string, ListItemRow[]>()
    for (const item of items) {
      if (!item.place) continue
      if (item.completed_at) continue
      if (!item.scheduled_date) continue
      // Skip items outside trip range (they're shown in backlog)
      if (tripRange) {
        if (item.scheduled_date < tripRange.start || item.scheduled_date > tripRange.end) continue
      }
      const existing = map.get(item.scheduled_date) ?? []
      existing.push(item)
      map.set(item.scheduled_date, existing)
    }
    for (const [date, dateItems] of map.entries()) {
      map.set(date, dateItems.slice().sort(sortByScheduledOrder))
    }
    return map
  }, [items, tripRange])

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return EMPTY_SCHEDULED_DAY_ITEMS
    return scheduledItemsByDate.get(selectedDay) ?? EMPTY_SCHEDULED_DAY_ITEMS
  }, [scheduledItemsByDate, selectedDay])

  /** Remount day detail when list/day or routing eligibility changes — resets preview hook and breaks stuck loops. */
  const plannerDayDetailKey = useMemo(() => {
    if (!listId || !selectedDay) return 'none'
    return `${listId}:${selectedDay}:${selectedDayItems.length >= 2 ? '1' : '0'}`
  }, [listId, selectedDay, selectedDayItems.length])

  // ── Data fetching ──
  const fetchPlan = useCallback(async () => {
    if (!listId) {
      setList(null)
      setItems([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items?limit=200`)
      const json = (await res.json().catch(() => ({}))) as Partial<ItemsResponse>
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      setList((json?.list ?? null) as ListSummary | null)
      setItems((json?.items ?? []) as ListItemRow[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [listId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    if (!listId) {
      setEditingTripDates(false)
      setTripStart('')
      setTripEnd('')
      setTripTimezone('')
      setMoveItemId(null)
      setSavingItemId(null)
      setSelectedDayAndStore(null)
      return
    }
    setMoveItemId(null)
    setSavingItemId(null)
  }, [listId, setSelectedDayAndStore])

  useEffect(() => {
    if (!list) return
    setTripStart(list.start_date ?? '')
    setTripEnd(list.end_date ?? '')
    setTripTimezone(
      list.timezone ??
        (typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : '')
    )
  }, [list])

  // Auto-select first trip day when trip dates load
  useEffect(() => {
    if (tripDates && tripDates.length > 0 && !selectedDay) {
      setSelectedDayAndStore(tripDates[0])
    }
  }, [tripDates, selectedDay, setSelectedDayAndStore])

  useEffect(() => {
    return () => {
      useTripStore.getState().setPlannerSelectedDay(null)
    }
  }, [])

  // Shell / MapInset: when planner day is set externally, align local grid selection
  useEffect(() => {
    if (!plannerSelectedDayFromStore) return
    if (plannerSelectedDayFromStore === selectedDay) return
    const td = tripDatesRef.current
    // Without a trip date list we cannot validate the store day — avoid setState ping-pong.
    if (!td?.length || !td.includes(plannerSelectedDayFromStore)) return
    setSelectedDay(plannerSelectedDayFromStore)
  }, [plannerSelectedDayFromStore, selectedDay, tripDatesKey])

  // MapInset pin → scroll to card in day detail (wait until selected day matches item)
  useEffect(() => {
    if (!focusedPlannerPlaceId) return

    const bailout = window.setTimeout(() => {
      useTripStore.getState().setFocusedPlannerPlaceId(null)
    }, 2000)

    const tripItems = useTripStore.getState().activeListItems
    const row = tripItems.find((i) => i.place_id === focusedPlannerPlaceId)
    if (!row?.scheduled_date || row.scheduled_date !== selectedDay) {
      return () => {
        window.clearTimeout(bailout)
      }
    }

    const timer = window.setTimeout(() => {
      window.clearTimeout(bailout)
      const root = document.querySelector('[data-testid="list-planner"]')
      const id =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(focusedPlannerPlaceId)
          : focusedPlannerPlaceId
      const el = root?.querySelector<HTMLElement>(`[data-place-id="${id}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-sky-400', 'ring-offset-2', 'transition-shadow')
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-sky-400', 'ring-offset-2', 'transition-shadow')
        }, 1600)
      }
      useTripStore.getState().setFocusedPlannerPlaceId(null)
    }, 150)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(bailout)
    }
  }, [focusedPlannerPlaceId, selectedDay])

  // Mirror ListDrawer: keep place IDs and list items in store for Plan mode map
  useEffect(() => {
    if (!listId) {
      useTripStore.getState().setActiveListPlaceIds([])
      useTripStore.getState().setActiveListItems([])
      return
    }
    const placeIds = items
      .map((item) => item.place?.id)
      .filter((id): id is string => Boolean(id))
    useTripStore.getState().setActiveListPlaceIds(placeIds)

    const mapped = items
      .map((item) => ({
        id: item.id,
        list_id: listId,
        place_id: item.place?.id,
        tags: item.tags ?? [],
        scheduled_date: item.scheduled_date ?? null,
        scheduled_start_time: item.scheduled_start_time ?? null,
        completed_at: item.completed_at ?? null,
        day_index: item.day_index ?? null,
      }))
      .filter(
        (row): row is NonNullable<typeof row> & { place_id: string } =>
          Boolean(row.place_id)
      )
    useTripStore.getState().setActiveListItems(mapped)
  }, [listId, items])

  // ── Drag setup ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const apply = () => setCanDrag(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  // ── Scheduling logic ──
  const nextOrderForDayMove = useCallback(
    (item: ListItemRow, targetDate: string, targetSlot: PlannerSlot, beforeItemId?: string) => {
      const dayItems = items
        .filter((row) => {
          if (row.id === item.id) return false
          if (!row.place || row.completed_at) return false
          return row.scheduled_date === targetDate
        })
        .slice()
        .sort(sortByScheduledOrder)

      if (beforeItemId) {
        const idx = dayItems.findIndex((row) => row.id === beforeItemId)
        if (idx >= 0) {
          const prev = idx > 0 ? orderValue(dayItems[idx - 1]) : null
          const next = orderValue(dayItems[idx])
          return fractionalOrderBetween(prev, next)
        }
      }

      // Append to end of the day
      const last = dayItems.length ? orderValue(dayItems[dayItems.length - 1]) : null
      return fractionalOrderBetween(last, null)
    },
    [items]
  )

  const scheduleItem = useCallback(
    async (
      item: ListItemRow,
      destination: MoveDestination,
      options?: { source?: ScheduleSource; scheduledOrder?: number }
    ) => {
      if (!listId) return
      if (!item.place) return
      const source = options?.source ?? 'tap_move'

      const currentSlot =
        item.scheduled_date && !item.completed_at
          ? slotFromScheduledStartTime(item.scheduled_start_time)
          : null
      const requestedOrder =
        typeof options?.scheduledOrder === 'number' ? options.scheduledOrder : null
      const currentOrder =
        typeof item.scheduled_order === 'number' ? item.scheduled_order : 0
      const hasOrderChange =
        requestedOrder != null &&
        Number.isFinite(requestedOrder) &&
        Math.abs(requestedOrder - currentOrder) > Number.EPSILON
      const isInBacklog = !item.completed_at && !item.scheduled_date
      const isDone = Boolean(item.completed_at)

      if (destination.type === 'backlog' && isInBacklog) {
        setMoveItemId(null)
        return
      }
      if (destination.type === 'done' && isDone) {
        setMoveItemId(null)
        return
      }
      if (
        destination.type === 'slot' &&
        !isDone &&
        item.scheduled_date === destination.date &&
        currentSlot === destination.slot &&
        !hasOrderChange
      ) {
        setMoveItemId(null)
        return
      }

      let payload:
        | {
            completed?: boolean
            scheduled_date?: string | null
            slot?: PlannerSlot | null
            scheduled_order?: number
            source: ScheduleSource
          }
        | { completed: boolean; source: ScheduleSource }

      if (destination.type === 'backlog') {
        payload = {
          completed: false,
          scheduled_date: null,
          slot: null,
          scheduled_order: 0,
          source,
        }
      } else if (destination.type === 'done') {
        payload = { completed: true, source }
      } else {
        const targetDate = destination.date
        const targetSlot = destination.slot
        const nextOrder =
          typeof options?.scheduledOrder === 'number'
            ? options.scheduledOrder
            : nextOrderForDayMove(item, targetDate, targetSlot)

        payload = {
          completed: false,
          scheduled_date: targetDate,
          slot: targetSlot,
          scheduled_order: nextOrder,
          source,
        }
      }

      const previousItems = items
      const nowIso = new Date().toISOString()
      const optimisticPatch: Partial<ListItemRow> = {}

      if ('completed' in payload) {
        optimisticPatch.completed_at = payload.completed ? nowIso : null
      }
      if ('scheduled_date' in payload) {
        optimisticPatch.scheduled_date = payload.scheduled_date ?? null
        optimisticPatch.scheduled_start_time =
          payload.slot != null ? scheduledStartTimeFromSlot(payload.slot) : null
        optimisticPatch.scheduled_order =
          typeof payload.scheduled_order === 'number'
            ? payload.scheduled_order
            : optimisticPatch.scheduled_order
      }

      setSavingItemId(item.id)
      setError(null)
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ...optimisticPatch } : row))
      )

      try {
        const res = await fetch(`/api/lists/${listId}/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = (await res.json().catch(() => ({}))) as any
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        const updated = json?.item as
          | {
              scheduled_date?: string | null
              scheduled_start_time?: string | null
              scheduled_order?: number | null
              completed_at?: string | null
            }
          | undefined
        if (updated) {
          setItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? {
                    ...row,
                    scheduled_date: updated.scheduled_date ?? row.scheduled_date,
                    scheduled_start_time:
                      updated.scheduled_start_time ?? row.scheduled_start_time,
                    scheduled_order:
                      typeof updated.scheduled_order === 'number'
                        ? updated.scheduled_order
                        : row.scheduled_order,
                    completed_at:
                      updated.completed_at === undefined
                        ? row.completed_at
                        : updated.completed_at,
                  }
                : row
            )
          )
        }
        onPlanMutated?.()
        setMoveItemId(null)
      } catch (err: unknown) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Move failed')
      } finally {
        setSavingItemId(null)
      }
    },
    [items, listId, nextOrderForDayMove, onPlanMutated]
  )

  // ── Drag handlers ──
  const onDragStart = useCallback((itemId: string) => {
    setDragItemId(itemId)
    setMoveItemId(null)
    setDropTargetKey(null)
  }, [])

  const onDragEnd = useCallback(() => {
    setDragItemId(null)
    setDropTargetKey(null)
  }, [])

  const onDragOverTarget = useCallback(
    (event: DragEvent, key: string) => {
      if (!canDrag || !dragItemId) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDropTargetKey(key)
    },
    [canDrag, dragItemId]
  )

  const onDropBacklog = useCallback(
    async (event: DragEvent) => {
      if (!dragItemId) return
      event.preventDefault()
      const item = items.find((row) => row.id === dragItemId)
      if (item) await scheduleItem(item, { type: 'backlog' }, { source: 'drag' })
      setDropTargetKey(null)
      setDragItemId(null)
    },
    [dragItemId, items, scheduleItem]
  )

  const onDropDone = useCallback(
    async (event: DragEvent) => {
      if (!dragItemId) return
      event.preventDefault()
      const item = items.find((row) => row.id === dragItemId)
      if (item) await scheduleItem(item, { type: 'done' }, { source: 'drag' })
      setDropTargetKey(null)
      setDragItemId(null)
    },
    [dragItemId, items, scheduleItem]
  )

  const onDropDay = useCallback(
    async (event: DragEvent, date: string) => {
      if (!dragItemId) return
      event.preventDefault()
      const item = items.find((row) => row.id === dragItemId)
      if (!item?.place) return

      // Preserve existing slot or default to morning
      const existingSlot = slotFromScheduledStartTime(item.scheduled_start_time)
      const targetSlot: PlannerSlot = existingSlot ?? 'morning'
      const scheduledOrder = nextOrderForDayMove(item, date, targetSlot)

      await scheduleItem(
        item,
        { type: 'slot', date, slot: targetSlot },
        { source: 'drag', scheduledOrder }
      )
      setDropTargetKey(null)
      setDragItemId(null)
    },
    [dragItemId, items, nextOrderForDayMove, scheduleItem]
  )

  const onDropReorder = useCallback(
    async (event: DragEvent, date: string, beforeItemId: string) => {
      if (!dragItemId) return
      event.preventDefault()
      const item = items.find((row) => row.id === dragItemId)
      if (!item?.place) return

      const existingSlot = slotFromScheduledStartTime(item.scheduled_start_time)
      const targetSlot: PlannerSlot = existingSlot ?? 'morning'
      const scheduledOrder = nextOrderForDayMove(item, date, targetSlot, beforeItemId)

      await scheduleItem(
        item,
        { type: 'slot', date, slot: targetSlot },
        { source: 'drag', scheduledOrder }
      )
      setDropTargetKey(null)
      setDragItemId(null)
    },
    [dragItemId, items, nextOrderForDayMove, scheduleItem]
  )

  // ── Trip date save/clear ──
  const saveTripDates = useCallback(async () => {
    if (!listId) return
    const start = tripStart.trim()
    const end = tripEnd.trim()
    const tz = tripTimezone.trim()
    if (!start || !end) {
      setError('Start and end dates are required.')
      return
    }
    setSavingTripDates(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ start_date: start, end_date: end, timezone: tz || null }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      const updated = json?.list as ListSummary | undefined
      if (updated) setList(updated)
      else await fetchPlan()
      onPlanMutated?.()
      setEditingTripDates(false)
      setSelectedDayAndStore(null) // reset selection so it auto-selects first day
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingTripDates(false)
    }
  }, [
    fetchPlan,
    listId,
    onPlanMutated,
    setSelectedDayAndStore,
    tripEnd,
    tripStart,
    tripTimezone,
  ])

  const clearTripDates = useCallback(async () => {
    if (!listId) return
    setSavingTripDates(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ start_date: null, end_date: null, timezone: null }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      const updated = json?.list as ListSummary | undefined
      setList(updated ?? null)
      onPlanMutated?.()
      setEditingTripDates(false)
      setSelectedDayAndStore(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingTripDates(false)
    }
  }, [listId, onPlanMutated, setSelectedDayAndStore])

  // ── Move picker handlers ──
  const handleMoveToDay = useCallback(
    (date: string) => {
      if (!movingItem) return
      const existingSlot = slotFromScheduledStartTime(movingItem.scheduled_start_time)
      const targetSlot: PlannerSlot = existingSlot ?? 'morning'
      scheduleItem(movingItem, { type: 'slot', date, slot: targetSlot })
    },
    [movingItem, scheduleItem]
  )

  // ── Early returns ──
  const headingClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const mutedClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'

  if (!listId) {
    return (
      <div className={`p-4 ${plannerToneClass}`}>
        <p className={`text-sm font-medium ${headingClass}`}>Plan</p>
        <p className={`mt-1 text-xs ${mutedClass}`}>
          Select a list to start planning.
        </p>
      </div>
    )
  }

  if (loading && !list) {
    return (
      <div className={`p-4 ${plannerToneClass}`}>
        <p className={`text-xs ${mutedClass}`}>Loading plan...</p>
      </div>
    )
  }

  if (error && !list) {
    return (
      <div className={`p-4 ${plannerToneClass}`}>
        <p className={`text-xs ${errorClass}`}>{error}</p>
      </div>
    )
  }

  // ── Move picker view ──
  if (moveItemId && movingItem?.place) {
    return (
      <PlannerMovePicker
        item={movingItem}
        tripDates={tripDates}
        tone={tone}
        savingItemId={savingItemId}
        onMoveBacklog={() => scheduleItem(movingItem, { type: 'backlog' })}
        onMoveDone={() => scheduleItem(movingItem, { type: 'done' })}
        onMoveToDay={handleMoveToDay}
        onClose={() => setMoveItemId(null)}
        error={error}
      />
    )
  }

  // ── Tone classes for Done section ──
  const doneHeadingClass = isDark ? 'text-slate-200' : 'text-slate-700'
  const doneCountClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const doneEmptyClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const doneCardBorder = isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/80'
  const doneNameClass = isDark ? 'text-slate-100 hover:underline' : 'text-slate-900 hover:underline'
  const doneMetaClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const doneMoveBtn = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:border-white/25'
    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
  const doneDropHighlight = isDark
    ? 'bg-slate-100/10 ring-1 ring-slate-200/40'
    : 'bg-sky-50 ring-1 ring-sky-300/50'
  const isTripRangeTooLong = Boolean(tripDaysCount && tripDaysCount > MAX_TRIP_DAYS_RENDER)
  const gridDates = tripDates ?? []

  // ── Shared content blocks ──
  const tripDatesBlock = (
    <PlannerTripDates
      list={list}
      tone={tone}
      editingTripDates={editingTripDates}
      setEditingTripDates={setEditingTripDates}
      tripStart={tripStart}
      setTripStart={setTripStart}
      tripEnd={tripEnd}
      setTripEnd={setTripEnd}
      tripTimezone={tripTimezone}
      setTripTimezone={setTripTimezone}
      savingTripDates={savingTripDates}
      onSave={saveTripDates}
      onClear={clearTripDates}
      error={editingTripDates ? error : null}
    />
  )

  const backlogBlock = (
    <div className={isDark ? '' : 'border-b border-slate-200 pb-4'}>
      <PlannerBacklog
        items={backlogItems}
        canDrag={canDrag}
        isDragOver={dropTargetKey === 'backlog'}
        tone={tone}
        resolveCategoryEmoji={resolveCategoryEmoji}
        onPlaceSelect={(id) => onPlaceSelect?.(id)}
        onMoveItem={setMoveItemId}
        onDragOver={(e) => onDragOverTarget(e, 'backlog')}
        onDrop={onDropBacklog}
        onDragStartItem={onDragStart}
        onDragEndItem={onDragEnd}
        savingItemId={savingItemId}
      />
    </div>
  )

  const dayGridBlock = tripRange ? (
    <section
      className={`space-y-3${isDark ? '' : ' border-b border-slate-200 pb-4'}`}
    >
      {isTripRangeTooLong ? (
        <p className={`text-[11px] ${mutedClass}`}>
          Trip spans {tripDaysCount} days. Showing only days with scheduled
          items to keep the planner fast.
        </p>
      ) : null}

      <PlannerDayGrid
        tripDates={gridDates}
        scheduledItemsByDate={scheduledItemsByDate}
        selectedDay={selectedDay}
        todayIso={todayIso}
        canDrag={canDrag}
        dropTargetKey={dropTargetKey}
        tone={tone}
        onSelectDay={setSelectedDayAndStore}
        onDragOverDay={(e, date) => onDragOverTarget(e, `day:${date}`)}
        onDropDay={onDropDay}
        onDragStartItem={onDragStart}
        onDragEndItem={onDragEnd}
      />

      {/* In column mode, day detail renders inline below grid */}
      {!isSplit && selectedDay ? (
        <PlannerDayDetail
          key={plannerDayDetailKey}
          date={selectedDay}
          items={selectedDayItems}
          listId={listId}
          canDrag={canDrag}
          dropTargetKey={dropTargetKey}
          tone={tone}
          resolveCategoryEmoji={resolveCategoryEmoji}
          onPlaceSelect={(id) => onPlaceSelect?.(id)}
          onMoveItem={setMoveItemId}
          onBack={() => setSelectedDayAndStore(null)}
          onDragOverItem={onDragOverTarget}
          onDropReorder={onDropReorder}
          onDragStartItem={onDragStart}
          onDragEndItem={onDragEnd}
          savingItemId={savingItemId}
        />
      ) : null}
    </section>
  ) : null

  const doneBlock = (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setDoneCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2"
      >
        <h3 className={`text-xs font-semibold ${doneHeadingClass}`}>
          Done
          <span className={`ml-1.5 font-normal ${doneCountClass}`}>
            {doneItems.length}
          </span>
        </h3>
        <span className={`text-[11px] ${doneCountClass}`}>
          {doneCollapsed ? '\u25b6' : '\u25bc'}
        </span>
      </button>

      {!doneCollapsed ? (
        <div
          className={`space-y-1.5 rounded-md p-1 transition ${
            dropTargetKey === 'done' ? doneDropHighlight : ''
          }`}
          onDragOver={(e) => onDragOverTarget(e, 'done')}
          onDrop={onDropDone}
        >
          {doneItems.length ? (
            doneItems.map((item) => {
              const place = item.place!
              return (
                <div
                  key={item.id}
                  draggable={canDrag}
                  onDragStart={() => onDragStart(item.id)}
                  onDragEnd={onDragEnd}
                  className={`rounded-lg border px-2.5 py-1.5 ${doneCardBorder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect?.(place.id)}
                    >
                      <p className={`truncate text-xs font-medium ${doneNameClass}`}>
                        {place.name}
                      </p>
                      <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${doneMetaClass}`}>
                        <span aria-hidden className="text-[12px] leading-none">
                          {resolveCategoryEmoji(place.category)}
                        </span>
                        <span>{place.category}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveItemId(item.id)}
                      disabled={savingItemId === item.id}
                      className={`shrink-0 rounded-md border px-2 py-1 text-[11px] disabled:opacity-60 ${doneMoveBtn}`}
                    >
                      Move
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <p className={`text-[11px] ${doneEmptyClass}`}>Nothing done yet.</p>
          )}
        </div>
      ) : null}
    </section>
  )

  const errorBlock =
    error && !editingTripDates ? (
      <p className={`text-xs ${errorClass}`}>{error}</p>
    ) : null

  // ── Split layout: left column (grid) + right column (day detail) ──
  if (isSplit) {
    return (
      <div className={`flex h-full ${plannerToneClass}`} data-testid="list-planner">
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mx-auto w-full max-w-4xl space-y-4">
            {tripDatesBlock}
            {backlogBlock}
            {dayGridBlock}
            {doneBlock}
            {errorBlock}
          </div>
        </div>
        <div className="w-[400px] shrink-0 overflow-y-auto border-l border-slate-200/80 bg-white/50 p-3">
          {selectedDay ? (
            <>
              <header className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatDayLabelFull(selectedDay)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(scheduledItemsByDate.get(selectedDay) ?? []).length} items
                  </span>
                </div>
              </header>
              <PlannerDayDetail
                key={plannerDayDetailKey}
                date={selectedDay}
                items={selectedDayItems}
                listId={listId}
                canDrag={canDrag}
                dropTargetKey={dropTargetKey}
                tone={tone}
                resolveCategoryEmoji={resolveCategoryEmoji}
                onPlaceSelect={(id) => onPlaceSelect?.(id)}
                onMoveItem={setMoveItemId}
                onBack={() => setSelectedDayAndStore(null)}
                showBackButton={false}
                onDragOverItem={onDragOverTarget}
                onDropReorder={onDropReorder}
                onDragStartItem={onDragStart}
                onDragEndItem={onDragEnd}
                savingItemId={savingItemId}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className={`text-sm ${mutedClass}`}>Select a day to see details</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Column layout (default): single scrollable column ──
  return (
    <div className={`p-3 space-y-4 ${plannerToneClass}`} data-testid="list-planner">
      {tripDatesBlock}
      {backlogBlock}
      {dayGridBlock}
      {doneBlock}
      {errorBlock}
    </div>
  )
}
