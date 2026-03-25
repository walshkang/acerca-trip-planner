'use client'

import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import type { CategoryEnum } from '@/lib/types/enums'
import type { ListItemRow, ListSummary } from '@/components/stitch/ListDetailBody'
import {
  type PlannerSlot,
  countIsoDatesInclusive,
  enumerateIsoDatesInclusive,
  isoDateInTimezone,
  scheduledStartTimeFromSlot,
  slotFromScheduledStartTime,
} from '@/lib/lists/planner'
import PlannerTripDates from '@/components/stitch/planner/PlannerTripDates'
import PlannerBacklog from '@/components/stitch/planner/PlannerBacklog'
import PlannerMovePicker from '@/components/stitch/planner/PlannerMovePicker'
import CalendarWeekGrid from '@/components/planner/CalendarWeekGrid'
import CalendarDayDetail from '@/components/planner/CalendarDayDetail'
import {
  nextScheduledOrderForSlot,
  sortItemsForDayCellDisplay,
} from '@/lib/lists/calendar-day-detail'
import { useTripStore } from '@/lib/state/useTripStore'

type Props = {
  listId: string
  onPlanMutated?: () => void
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

const tone = 'light' as const

function sortByCreatedAtAsc(a: { created_at: string }, b: { created_at: string }) {
  return a.created_at.localeCompare(b.created_at)
}

function sortByScheduledOrder(a: ListItemRow, b: ListItemRow) {
  const ao = typeof a.scheduled_order === 'number' ? a.scheduled_order : 0
  const bo = typeof b.scheduled_order === 'number' ? b.scheduled_order : 0
  if (ao !== bo) return ao - bo
  return a.created_at.localeCompare(b.created_at)
}

export default function CalendarPlanner({ listId, onPlanMutated }: Props) {
  const { resolveCategoryEmoji: resolveCategoryEmojiTyped } = useCategoryIconOverrides(listId)
  const resolveCategoryEmoji = useCallback(
    (category: string) => resolveCategoryEmojiTyped(category as CategoryEnum),
    [resolveCategoryEmojiTyped]
  )

  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingTripDates, setEditingTripDates] = useState(false)
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [tripTimezone, setTripTimezone] = useState('')
  const [savingTripDates, setSavingTripDates] = useState(false)

  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const setSelectedDayAndStore = useCallback((day: string | null) => {
    setSelectedDay(day)
    useTripStore.getState().setPlannerSelectedDay(day)
  }, [])
  const plannerSelectedDayFromStore = useTripStore((s) => s.plannerSelectedDay)

  const [doneCollapsed, setDoneCollapsed] = useState(true)

  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const [canDrag, setCanDrag] = useState(false)

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
      if (tripRange) {
        if (item.scheduled_date < tripRange.start || item.scheduled_date > tripRange.end) continue
      }
      const existing = map.get(item.scheduled_date) ?? []
      existing.push(item)
      map.set(item.scheduled_date, existing)
    }
    for (const [date, dateItems] of map.entries()) {
      map.set(date, sortItemsForDayCellDisplay(dateItems))
    }
    return map
  }, [items, tripRange])

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return []
    return scheduledItemsByDate.get(selectedDay) ?? []
  }, [scheduledItemsByDate, selectedDay])

  const fetchPlan = useCallback(async () => {
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
    void fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    setMoveItemId(null)
    setSavingItemId(null)
    setSelectedDayAndStore(null)
  }, [listId, setSelectedDayAndStore])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const apply = () => setCanDrag(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

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

  useEffect(() => {
    if (!plannerSelectedDayFromStore) return
    if (plannerSelectedDayFromStore === selectedDay) return
    const td = tripDatesRef.current
    if (!td?.length || !td.includes(plannerSelectedDayFromStore)) return
    setSelectedDay(plannerSelectedDayFromStore)
  }, [plannerSelectedDayFromStore, selectedDay, tripDatesKey])

  useEffect(() => {
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

  const nextOrderForDayMove = useCallback(
    (item: ListItemRow, targetDate: string, targetSlot: PlannerSlot, beforeItemId?: string) => {
      const dayItems = items.filter((row) => {
        if (row.id === item.id) return false
        if (!row.place || row.completed_at) return false
        return row.scheduled_date === targetDate
      })
      return nextScheduledOrderForSlot(dayItems, targetSlot, beforeItemId)
    },
    [items]
  )

  const scheduleItem = useCallback(
    async (
      item: ListItemRow,
      destination: MoveDestination,
      options?: { source?: ScheduleSource; scheduledOrder?: number }
    ) => {
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
        const json = (await res.json().catch(() => ({}))) as {
          error?: string
          item?: {
            scheduled_date?: string | null
            scheduled_start_time?: string | null
            scheduled_order?: number | null
            completed_at?: string | null
          }
        }
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        const updated = json?.item
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

  const saveTripDates = useCallback(async () => {
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
      const json = (await res.json().catch(() => ({}))) as { error?: string; list?: ListSummary }
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      const updated = json?.list
      if (updated) setList(updated)
      else await fetchPlan()
      onPlanMutated?.()
      setEditingTripDates(false)
      setSelectedDayAndStore(null)
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
    setSavingTripDates(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ start_date: null, end_date: null, timezone: null }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; list?: ListSummary }
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      const updated = json?.list
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

  const handleMoveToDay = useCallback(
    (date: string) => {
      if (!movingItem) return
      const existingSlot = slotFromScheduledStartTime(movingItem.scheduled_start_time)
      const targetSlot: PlannerSlot = existingSlot ?? 'morning'
      void scheduleItem(movingItem, { type: 'slot', date, slot: targetSlot })
    },
    [movingItem, scheduleItem]
  )

  const onPlaceSelect = useCallback((placeId: string) => {
    useTripStore.getState().setFocusedPlannerPlaceId(placeId)
  }, [])

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

  const onDropDetailReorder = useCallback(
    async (event: DragEvent, date: string, beforeItemId: string) => {
      if (!dragItemId) return
      if (dragItemId === beforeItemId) return
      event.preventDefault()
      event.stopPropagation()
      const item = items.find((row) => row.id === dragItemId)
      if (!item?.place) return

      const beforeItem = items.find((row) => row.id === beforeItemId)
      const targetSlot: PlannerSlot =
        slotFromScheduledStartTime(beforeItem?.scheduled_start_time) ?? 'morning'
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

  const onDropSlotSection = useCallback(
    async (event: DragEvent, date: string, slot: PlannerSlot) => {
      if (!dragItemId) return
      event.preventDefault()
      event.stopPropagation()
      const item = items.find((row) => row.id === dragItemId)
      if (!item?.place) return

      const scheduledOrder = nextOrderForDayMove(item, date, slot)

      await scheduleItem(
        item,
        { type: 'slot', date, slot },
        { source: 'drag', scheduledOrder }
      )
      setDropTargetKey(null)
      setDragItemId(null)
    },
    [dragItemId, items, nextOrderForDayMove, scheduleItem]
  )

  const mutedClass = 'text-slate-600'
  const errorClass = 'text-red-600'

  const isTripRangeTooLong = Boolean(tripDaysCount && tripDaysCount > MAX_TRIP_DAYS_RENDER)

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

  const weekGridBlock = tripRange ? (
    <section className="space-y-3 border-b border-slate-200 pb-4 md:border-paper-tertiary-fixed">
      {isTripRangeTooLong ? (
        <p className={`text-[11px] ${mutedClass}`}>
          Trip spans {tripDaysCount} days. Showing only days with scheduled items to keep the planner
          fast.
        </p>
      ) : null}
      {!isTripRangeTooLong ? (
        <CalendarWeekGrid
          tripStart={tripRange.start}
          tripEnd={tripRange.end}
          itemsByDate={scheduledItemsByDate}
          selectedDay={selectedDay}
          todayIso={todayIso}
          onSelectDay={setSelectedDayAndStore}
          resolveCategoryEmoji={resolveCategoryEmoji}
          canDrag={canDrag}
          dropTargetKey={dropTargetKey}
          onDragOverDay={(e, date) => onDragOverTarget(e, `day:${date}`)}
          onDropDay={onDropDay}
          onDragStartItem={onDragStart}
          onDragEndItem={onDragEnd}
          dragItemId={dragItemId}
        />
      ) : null}
    </section>
  ) : null

  const backlogBlock = (
    <div className="border-b border-slate-200 pb-4 md:border-paper-tertiary-fixed">
      <PlannerBacklog
        items={backlogItems}
        canDrag={canDrag}
        isDragOver={dropTargetKey === 'backlog'}
        tone={tone}
        resolveCategoryEmoji={resolveCategoryEmoji}
        onPlaceSelect={onPlaceSelect}
        onMoveItem={setMoveItemId}
        onDragOver={(e) => onDragOverTarget(e, 'backlog')}
        onDrop={onDropBacklog}
        onDragStartItem={onDragStart}
        onDragEndItem={onDragEnd}
        savingItemId={savingItemId}
      />
    </div>
  )

  const doneHeadingClass = 'text-slate-700'
  const doneCountClass = 'text-slate-500'
  const doneEmptyClass = 'text-slate-500'
  const doneCardBorder = 'border-slate-200 bg-white/80'
  const doneNameClass = 'text-slate-900 hover:underline'
  const doneMetaClass = 'text-slate-600'
  const doneMoveBtn =
    'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
  const doneDropHighlight = 'bg-paper-surface-container ring-2 ring-paper-primary'

  const doneBlock = (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setDoneCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2"
      >
        <h3
          className={`text-xs font-semibold md:font-headline md:font-extrabold md:uppercase md:tracking-tighter ${doneHeadingClass}`}
        >
          Done
          <span className={`ml-1.5 font-normal ${doneCountClass}`}>{doneItems.length}</span>
        </h3>
        <span className={`text-[11px] ${doneCountClass}`}>
          {doneCollapsed ? '\u25b6' : '\u25bc'}
        </span>
      </button>

      {!doneCollapsed ? (
        <div
          className={`space-y-1.5 rounded-md p-1 transition md:rounded-[2px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:p-2 ${
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
                  className={`rounded-lg border px-2.5 py-1.5 md:rounded-[2px] ${doneCardBorder} md:!border-paper-tertiary-fixed md:!bg-paper-surface-container-low`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect(place.id)}
                    >
                      <p
                        className={`truncate text-xs font-medium md:font-headline md:font-extrabold md:uppercase md:tracking-tight ${doneNameClass}`}
                      >
                        {place.name}
                      </p>
                      <p
                        className={`mt-0.5 inline-flex items-center gap-1 text-[11px] md:text-paper-on-surface-variant ${doneMetaClass}`}
                      >
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
                      className={`shrink-0 rounded-md border px-2 py-1 text-[11px] disabled:opacity-60 md:rounded-[4px] md:!border-paper-tertiary-fixed md:!bg-paper-surface-container md:!text-paper-on-surface hover:md:!bg-paper-tertiary-fixed ${doneMoveBtn}`}
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
    error && !editingTripDates ? <p className={`text-xs ${errorClass}`}>{error}</p> : null

  if (loading && !list) {
    return (
      <div className="p-4 planner-light" data-testid="calendar-planner">
        <p className={`text-xs ${mutedClass}`}>Loading plan...</p>
      </div>
    )
  }

  if (error && !list) {
    return (
      <div className="p-4 planner-light" data-testid="calendar-planner">
        <p className={`text-xs ${errorClass}`}>{error}</p>
      </div>
    )
  }

  if (moveItemId && movingItem?.place) {
    return (
      <div className="flex h-full planner-light" data-testid="calendar-planner">
        <PlannerMovePicker
          item={movingItem}
          tripDates={tripDates}
          tone={tone}
          savingItemId={savingItemId}
          onMoveBacklog={() => void scheduleItem(movingItem, { type: 'backlog' })}
          onMoveDone={() => void scheduleItem(movingItem, { type: 'done' })}
          onMoveToDay={handleMoveToDay}
          onClose={() => setMoveItemId(null)}
          error={error}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full planner-light" data-testid="calendar-planner">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <div className="w-full space-y-4">
          {tripDatesBlock}
          {weekGridBlock}
          {backlogBlock}
          {doneBlock}
          {errorBlock}
        </div>
      </div>
      <div className="w-[400px] shrink-0 overflow-y-auto border-l border-paper-tertiary-fixed bg-paper-surface-warm p-3">
        {selectedDay ? (
          <CalendarDayDetail
            date={selectedDay}
            items={selectedDayItems}
            resolveCategoryEmoji={resolveCategoryEmoji}
            onPlaceSelect={onPlaceSelect}
            onMoveItem={setMoveItemId}
            canDrag={canDrag}
            dropTargetKey={dropTargetKey}
            onDragOverItem={onDragOverTarget}
            onDropReorder={onDropDetailReorder}
            onDropSlotSection={onDropSlotSection}
            onDragStartItem={onDragStart}
            onDragEndItem={onDragEnd}
            savingItemId={savingItemId}
          />
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center">
            <p className="text-sm text-paper-on-surface-variant">Select a day to see details</p>
          </div>
        )}
      </div>
    </div>
  )
}
