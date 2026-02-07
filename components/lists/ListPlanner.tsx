'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { CategoryEnum } from '@/lib/types/enums'
import type { ListItemRow, ListSummary } from '@/components/lists/ListDetailBody'
import {
  type PlannerSlot,
  PLANNER_SLOT_LABEL,
  PLANNER_SLOT_ORDER,
  comparePlannerCategories,
  countIsoDatesInclusive,
  enumerateIsoDatesInclusive,
  scheduledStartTimeFromSlot,
  slotFromScheduledStartTime,
} from '@/lib/lists/planner'

type Props = {
  listId: string | null
  onPlaceSelect?: (placeId: string) => void
}

type ItemsResponse = {
  list: ListSummary
  items: ListItemRow[]
}

type MoveDestination =
  | { type: 'backlog' }
  | { type: 'done' }
  | { type: 'slot'; date: string; slot: PlannerSlot }

const MAX_TRIP_DAYS_RENDER = 21

function sortByCreatedAtAsc(a: { created_at: string }, b: { created_at: string }) {
  return a.created_at.localeCompare(b.created_at)
}

function sortByScheduledOrder(a: ListItemRow, b: ListItemRow) {
  const ao = typeof a.scheduled_order === 'number' ? a.scheduled_order : 0
  const bo = typeof b.scheduled_order === 'number' ? b.scheduled_order : 0
  if (ao !== bo) return ao - bo
  return a.created_at.localeCompare(b.created_at)
}

function formatDayLabel(isoDate: string) {
  return isoDate
}

export default function ListPlanner({ listId, onPlaceSelect }: Props) {
  const [list, setList] = useState<ListSummary | null>(null)
  const [items, setItems] = useState<ListItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [moveDate, setMoveDate] = useState('')
  const [editingTripDates, setEditingTripDates] = useState(false)
  const [tripStart, setTripStart] = useState('')
  const [tripEnd, setTripEnd] = useState('')
  const [tripTimezone, setTripTimezone] = useState('')
  const [savingTripDates, setSavingTripDates] = useState(false)

  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

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

  const movingItem = useMemo(() => {
    if (!moveItemId) return null
    return items.find((item) => item.id === moveItemId) ?? null
  }, [items, moveItemId])

  useEffect(() => {
    if (!moveItemId || !movingItem) {
      setMoveDate('')
      return
    }
    if (!tripRange) {
      setMoveDate('')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const withinRange = (value: string) =>
      value >= tripRange.start && value <= tripRange.end
    const preferred =
      movingItem.scheduled_date && withinRange(movingItem.scheduled_date)
        ? movingItem.scheduled_date
        : withinRange(today)
          ? today
          : tripRange.start
    setMoveDate(preferred)
  }, [moveItemId, movingItem, tripRange])

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
      return
    }
    setMoveItemId(null)
    setSavingItemId(null)
  }, [listId])

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

  const backlogItems = useMemo(() => {
    return items
      .filter((item) => Boolean(item.place) && !item.completed_at && !item.scheduled_date)
      .slice()
      .sort(sortByCreatedAtAsc)
  }, [items])

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
      const existing = map.get(item.scheduled_date) ?? []
      existing.push(item)
      map.set(item.scheduled_date, existing)
    }
    for (const [date, dateItems] of map.entries()) {
      map.set(date, dateItems.slice().sort(sortByScheduledOrder))
    }
    return map
  }, [items])

  const scheduledOutsideTrip = useMemo(() => {
    if (!tripRange) return []
    const out: ListItemRow[] = []
    for (const item of items) {
      if (!item.place) continue
      if (item.completed_at) continue
      if (!item.scheduled_date) continue
      if (item.scheduled_date < tripRange.start) out.push(item)
      else if (item.scheduled_date > tripRange.end) out.push(item)
    }
    return out.slice().sort(sortByScheduledOrder)
  }, [items, tripRange])

  const scheduledDatesInRange = useMemo(() => {
    if (!tripRange) return []
    const inRange: string[] = []
    for (const date of scheduledItemsByDate.keys()) {
      if (date < tripRange.start) continue
      if (date > tripRange.end) continue
      inRange.push(date)
    }
    inRange.sort()
    return inRange
  }, [scheduledItemsByDate, tripRange])

  const scheduleItem = useCallback(
    async (item: ListItemRow, destination: MoveDestination) => {
      if (!listId) return
      if (!item.place) return

      const currentSlot =
        item.scheduled_date && !item.completed_at
          ? slotFromScheduledStartTime(item.scheduled_start_time)
          : null
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
        currentSlot === destination.slot
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
            source: 'tap_move'
          }
        | {
            completed: boolean
            source: 'tap_move'
          }

      if (destination.type === 'backlog') {
        payload = {
          completed: false,
          scheduled_date: null,
          slot: null,
          scheduled_order: 0,
          source: 'tap_move',
        }
      } else if (destination.type === 'done') {
        payload = { completed: true, source: 'tap_move' }
      } else {
        const category = item.place.category as CategoryEnum
        const targetDate = destination.date
        const targetSlot = destination.slot
        const sentinel = scheduledStartTimeFromSlot(targetSlot)

        let maxOrder = 0
        for (const row of items) {
          if (!row.place) continue
          if (row.completed_at) continue
          if (row.scheduled_date !== targetDate) continue
          const rowSlot = slotFromScheduledStartTime(row.scheduled_start_time)
          if (!rowSlot) continue
          if (scheduledStartTimeFromSlot(rowSlot).slice(0, 5) !== sentinel.slice(0, 5))
            continue
          if (row.place.category !== category) continue
          const orderValue =
            typeof row.scheduled_order === 'number' ? row.scheduled_order : 0
          maxOrder = Math.max(maxOrder, orderValue)
        }

        payload = {
          completed: false,
          scheduled_date: targetDate,
          slot: targetSlot,
          scheduled_order: maxOrder + 1,
          source: 'tap_move',
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
        setMoveItemId(null)
      } catch (err: unknown) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Move failed')
      } finally {
        setSavingItemId(null)
      }
    },
    [items, listId]
  )

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
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          timezone: tz || null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updated = json?.list as ListSummary | undefined
      if (updated) {
        setList(updated)
      } else {
        await fetchPlan()
      }
      setEditingTripDates(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingTripDates(false)
    }
  }, [fetchPlan, listId, tripEnd, tripStart, tripTimezone])

  const clearTripDates = useCallback(async () => {
    if (!listId) return
    setSavingTripDates(true)
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start_date: null,
          end_date: null,
          timezone: null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as any
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updated = json?.list as ListSummary | undefined
      setList(updated ?? null)
      setEditingTripDates(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingTripDates(false)
    }
  }, [listId])

  if (!listId) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-slate-100">Plan</p>
        <p className="mt-1 text-xs text-slate-300">
          Select a list to start planning.
        </p>
      </div>
    )
  }

  if (loading && !list) {
    return (
      <div className="p-4">
        <p className="text-xs text-slate-300">Loading plan…</p>
      </div>
    )
  }

  if (error && !list) {
    return (
      <div className="p-4">
        <p className="text-xs text-red-300">{error}</p>
      </div>
    )
  }

  if (moveItemId && movingItem?.place) {
    const place = movingItem.place
    const canScheduleByDay = Boolean(tripRange)
    const withinTripRange =
      Boolean(tripRange) &&
      Boolean(moveDate) &&
      moveDate >= (tripRange?.start ?? '9999-99-99') &&
      moveDate <= (tripRange?.end ?? '0000-00-00')
    return (
      <div className="p-3" data-testid="planner-move-picker">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMoveItemId(null)}
            className="text-xs text-slate-300 hover:text-slate-100"
          >
            Back
          </button>
          <p className="truncate text-xs text-slate-200">
            Move {place.name}
          </p>
          <span className="w-10" />
        </div>

        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => scheduleItem(movingItem, { type: 'backlog' })}
              disabled={savingItemId === movingItem.id}
              className="glass-button w-full disabled:opacity-60"
            >
              Backlog
            </button>
            <button
              type="button"
              onClick={() => scheduleItem(movingItem, { type: 'done' })}
              disabled={savingItemId === movingItem.id}
              className="glass-button w-full disabled:opacity-60"
            >
              Done
            </button>
          </div>

          {canScheduleByDay ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-200">
                Trip days
              </p>
              <div className="space-y-2">
                <label className="space-y-1 text-[11px] text-slate-300">
                  <span>Date</span>
                  <input
                    type="date"
                    value={moveDate}
                    min={tripRange?.start ?? undefined}
                    max={tripRange?.end ?? undefined}
                    onChange={(e) => setMoveDate(e.target.value)}
                    className="glass-input w-full text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90"
                    disabled={savingItemId === movingItem.id}
                  />
                </label>
                {!withinTripRange && moveDate ? (
                  <p className="text-[11px] text-red-300">
                    Pick a date within the trip range.
                  </p>
                ) : null}
                <div className="grid grid-cols-3 gap-2">
                  {PLANNER_SLOT_ORDER.map((slot) => (
                    <button
                      key={`${moveDate || 'date'}-${slot}`}
                      type="button"
                      onClick={() =>
                        scheduleItem(movingItem, {
                          type: 'slot',
                          date: moveDate,
                          slot,
                        })
                      }
                      disabled={
                        savingItemId === movingItem.id || !moveDate || !withinTripRange
                      }
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-[11px] text-slate-100 hover:border-white/25 disabled:opacity-60"
                    >
                      {PLANNER_SLOT_LABEL[slot]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-300">
              Set trip dates to schedule by day.
            </p>
          )}

          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>
    )
  }

  const isTripRangeTooLong = Boolean(
    tripDaysCount && tripDaysCount > MAX_TRIP_DAYS_RENDER
  )
  const scheduleDatesToRender = tripDates ?? scheduledDatesInRange

  return (
    <div className="p-4 space-y-6" data-testid="list-planner">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">
              Plan
            </p>
            {list ? (
              <p className="mt-0.5 truncate text-xs text-slate-300">
                {list.name}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {list?.start_date && list?.end_date ? (
              <button
                type="button"
                onClick={() => setEditingTripDates((prev) => !prev)}
                className="text-[11px] text-slate-300 underline hover:text-slate-100"
              >
                {editingTripDates ? 'Close' : 'Edit dates'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingTripDates(true)}
                className="text-[11px] text-slate-300 underline hover:text-slate-100"
              >
                Set dates
              </button>
            )}
          </div>
        </div>

        {editingTripDates ? (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-[11px] text-slate-300">
                <span>Start</span>
                <input
                  type="date"
                  value={tripStart}
                  onChange={(e) => setTripStart(e.target.value)}
                  className="glass-input w-full text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90"
                  disabled={savingTripDates}
                />
              </label>
              <label className="space-y-1 text-[11px] text-slate-300">
                <span>End</span>
                <input
                  type="date"
                  value={tripEnd}
                  onChange={(e) => setTripEnd(e.target.value)}
                  className="glass-input w-full text-xs [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-90"
                  disabled={savingTripDates}
                />
              </label>
            </div>
            <label className="space-y-1 text-[11px] text-slate-300">
              <span>Timezone (IANA)</span>
              <input
                value={tripTimezone}
                onChange={(e) => setTripTimezone(e.target.value)}
                className="glass-input w-full text-xs"
                placeholder="America/New_York"
                disabled={savingTripDates}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={saveTripDates}
                disabled={savingTripDates}
                className="glass-button disabled:opacity-60"
              >
                {savingTripDates ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={clearTripDates}
                disabled={savingTripDates}
                className="text-[11px] text-slate-300 underline hover:text-slate-100 disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </div>
        ) : list?.start_date || list?.end_date ? (
          <div className="mt-2 text-[11px] text-slate-300">
            {list.start_date ?? '—'} → {list.end_date ?? '—'}
            {list.timezone ? ` · ${list.timezone}` : null}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-slate-300">
            Set trip dates to schedule by day. Backlog and Done are always
            available.
          </p>
        )}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-200">Backlog</h3>
          <span className="text-[11px] text-slate-400">
            {backlogItems.length}
          </span>
        </div>
        {backlogItems.length ? (
          <div className="space-y-2">
            {backlogItems.map((item) => {
              const place = item.place!
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect?.(place.id)}
                    >
                      <p className="truncate text-sm font-medium text-slate-100 hover:underline">
                        {place.name}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-300">
                        <img
                          src={getCategoryIcon(place.category)}
                          alt=""
                          aria-hidden="true"
                          className="h-3 w-3"
                        />
                        <span>{place.category}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveItemId(item.id)}
                      disabled={savingItemId === item.id}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:border-white/25 disabled:opacity-60"
                    >
                      Move
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">Nothing in backlog.</p>
        )}
      </section>

      {tripRange ? (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-200">Schedule</h3>
          {isTripRangeTooLong ? (
            <p className="text-[11px] text-slate-300">
              Trip spans {tripDaysCount} days. Showing only days with scheduled
              items to keep the planner fast.
            </p>
          ) : null}
          {!scheduleDatesToRender.length ? (
            <p className="text-[11px] text-slate-400">
              Nothing scheduled yet. Use Move from Backlog to place items into a
              day slot.
            </p>
          ) : null}
          <div className="space-y-4">
            {scheduleDatesToRender.map((date) => {
              const scheduledForDay = scheduledItemsByDate.get(date) ?? []

              const bySlot = new Map<PlannerSlot, ListItemRow[]>()
              for (const item of scheduledForDay) {
                const slot = slotFromScheduledStartTime(item.scheduled_start_time) ?? 'morning'
                const existing = bySlot.get(slot) ?? []
                existing.push(item)
                bySlot.set(slot, existing)
              }

              return (
                <div key={date} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-100">
                      {formatDayLabel(date)}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {scheduledForDay.length}
                    </span>
                  </div>

                  {!scheduledForDay.length ? (
                    <p className="text-[11px] text-slate-400">
                      Nothing scheduled yet.
                    </p>
                  ) : null}

                  {PLANNER_SLOT_ORDER.map((slot) => {
                    const slotItems = (bySlot.get(slot) ?? []).slice()
                    if (!slotItems.length) {
                      return (
                        <div key={slot} className="space-y-1">
                          <p className="text-[11px] font-semibold text-slate-200">
                            {PLANNER_SLOT_LABEL[slot]}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Empty.
                          </p>
                        </div>
                      )
                    }

                    const byCategory = new Map<CategoryEnum, ListItemRow[]>()
                    for (const item of slotItems) {
                      const category = item.place?.category
                      if (!category) continue
                      const existing = byCategory.get(category) ?? []
                      existing.push(item)
                      byCategory.set(category, existing)
                    }

                    const categories = Array.from(byCategory.keys()).sort(
                      comparePlannerCategories
                    )

                    return (
                      <div key={slot} className="space-y-2">
                        <p className="text-[11px] font-semibold text-slate-200">
                          {PLANNER_SLOT_LABEL[slot]}
                        </p>
                        <div className="space-y-2">
                          {categories.map((category) => {
                            const categoryItems = (byCategory.get(category) ?? [])
                              .slice()
                              .sort(sortByScheduledOrder)
                            if (!categoryItems.length) return null

                            return (
                              <div key={`${date}-${slot}-${category}`} className="space-y-2">
                                <p className="text-[11px] text-slate-300 inline-flex items-center gap-1">
                                  <img
                                    src={getCategoryIcon(category)}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-3 w-3"
                                  />
                                  <span>{category}</span>
                                </p>
                                <div className="space-y-2">
                                  {categoryItems.map((item) => {
                                    const place = item.place!
                                    return (
                                      <div
                                        key={item.id}
                                        className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <button
                                            type="button"
                                            className="min-w-0 text-left"
                                            onClick={() => onPlaceSelect?.(place.id)}
                                          >
                                            <p className="truncate text-sm font-medium text-slate-100 hover:underline">
                                              {place.name}
                                            </p>
                                            {place.address ? (
                                              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                                {place.address}
                                              </p>
                                            ) : null}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setMoveItemId(item.id)}
                                            disabled={savingItemId === item.id}
                                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:border-white/25 disabled:opacity-60"
                                          >
                                            Move
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {scheduledOutsideTrip.length ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-200">
                Outside trip range
              </p>
              <div className="space-y-2">
                {scheduledOutsideTrip.map((item) => {
                  const place = item.place!
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => onPlaceSelect?.(place.id)}
                        >
                          <p className="truncate text-sm font-medium text-slate-100 hover:underline">
                            {place.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {item.scheduled_date}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveItemId(item.id)}
                          disabled={savingItemId === item.id}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:border-white/25 disabled:opacity-60"
                        >
                          Move
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-200">Done</h3>
          <span className="text-[11px] text-slate-400">{doneItems.length}</span>
        </div>
        {doneItems.length ? (
          <div className="space-y-2">
            {doneItems.map((item) => {
              const place = item.place!
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onPlaceSelect?.(place.id)}
                    >
                      <p className="truncate text-sm font-medium text-slate-100 hover:underline">
                        {place.name}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-300">
                        <img
                          src={getCategoryIcon(place.category)}
                          alt=""
                          aria-hidden="true"
                          className="h-3 w-3"
                        />
                        <span>{place.category}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveItemId(item.id)}
                      disabled={savingItemId === item.id}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:border-white/25 disabled:opacity-60"
                    >
                      Move
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">Nothing done yet.</p>
        )}
      </section>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
