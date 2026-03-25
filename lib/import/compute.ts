import type {
  ComputedFields,
  ImportRow,
  PreviewRow,
  ResolvedEnrichment,
  TripSummary,
} from '@/lib/import/contract'
import { SLOT_TIME_RANGE } from '@/lib/import/contract'
import type { PlannerSlot } from '@/lib/lists/planner'
import { PLANNER_SLOT_ORDER, parseIsoDateOnly } from '@/lib/lists/planner'

// ---------------------------------------------------------------------------
// Opening hours (Google weekday lines)
// ---------------------------------------------------------------------------

export type ParsedHours = {
  day: number
  open: number
  close: number
  closed: boolean
}

const DAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function parseTimeToMinutes(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ap = m[3].toUpperCase()
  if (h < 1 || h > 12 || min < 0 || min > 59) return null
  if (ap === 'AM') {
    if (h === 12) h = 0
  } else {
    if (h !== 12) h += 12
  }
  return h * 60 + min
}

/**
 * Google lines like "Monday: 9:00 AM – 10:00 PM", "Monday: Closed", "Open 24 hours".
 * Returns [] if any line is malformed.
 */
export function parseGoogleOpeningHours(hours: string[]): ParsedHours[] {
  const out: ParsedHours[] = []
  for (const line of hours) {
    const colon = line.indexOf(':')
    if (colon < 0) return []
    const dayName = line.slice(0, colon).trim().toLowerCase()
    const rest = line.slice(colon + 1).trim()
    const day = DAY_TO_INDEX[dayName]
    if (day === undefined) return []

    const closedM = /^closed$/i.test(rest)
    if (closedM) {
      out.push({ day, open: 0, close: 0, closed: true })
      continue
    }

    const open24 = /^open\s+24\s+hours?$/i.test(rest)
    if (open24) {
      out.push({ day, open: 0, close: 24 * 60, closed: false })
      continue
    }

    const sep = rest.includes('–') ? '–' : rest.includes('-') ? '-' : null
    if (!sep) return []
    const parts = rest.split(sep === '–' ? '–' : '-').map((s) => s.trim())
    if (parts.length !== 2) return []
    const openMin = parseTimeToMinutes(parts[0])
    const closeMin = parseTimeToMinutes(parts[1])
    if (openMin === null || closeMin === null) return []
    out.push({ day, open: openMin, close: closeMin, closed: false })
  }
  return out
}

function intervalsOpenForDay(
  parsed: ParsedHours[],
  dayIndex: number
): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = []
  for (const p of parsed) {
    if (p.day !== dayIndex) continue
    if (p.closed) continue
    if (p.open === 0 && p.close === 24 * 60) {
      intervals.push({ start: 0, end: 24 * 60 })
      continue
    }
    if (p.close > p.open) {
      intervals.push({ start: p.open, end: p.close })
    } else {
      // Overnight: e.g. 22:00–02:00 — treat as [open, 1440) ∪ [0, close)
      intervals.push({ start: p.open, end: 24 * 60 })
      intervals.push({ start: 0, end: p.close })
    }
  }
  return intervals
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function isOpenDuringSlot(
  hours: string[] | null,
  date: string,
  slot: PlannerSlot
): boolean | null {
  if (hours === null) return null
  if (!parseIsoDateOnly(date)) return null
  const parsed = parseGoogleOpeningHours(hours)
  if (parsed.length === 0) return null

  const d = new Date(`${date}T12:00:00.000Z`)
  const dayIndex = d.getUTCDay()
  const venueIntervals = intervalsOpenForDay(parsed, dayIndex)
  if (venueIntervals.length === 0) return false

  const range = SLOT_TIME_RANGE[slot]
  const slotStart = range.start * 60
  const slotEnd = range.end * 60

  for (const vi of venueIntervals) {
    if (intervalsOverlap(slotStart, slotEnd, vi.start, vi.end)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Distance / travel
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const km = EARTH_RADIUS_KM * c
  return Math.round(km * 100) / 100
}

export function estimateWalkingMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 5) * 60)
}

// ---------------------------------------------------------------------------
// Per-day computed fields
// ---------------------------------------------------------------------------

export function computeFieldsForDay(
  rows: Array<{ resolved: ResolvedEnrichment; input: ImportRow }>,
  slotsWithConflict: Set<PlannerSlot>
): ComputedFields[] {
  const energies: EnergyEnum[] = []
  return rows.map((row, i) => {
    const { resolved, input } = row
    energies.push(resolved.energy)

    let distance_from_previous_km: number | null = null
    let travel_time_minutes: number | null = null
    if (i > 0) {
      const prev = rows[i - 1].resolved
      const hasCoords =
        Number.isFinite(prev.lat) &&
        Number.isFinite(prev.lng) &&
        Number.isFinite(resolved.lat) &&
        Number.isFinite(resolved.lng)
      if (hasCoords) {
        distance_from_previous_km = haversineDistanceKm(
          prev.lat,
          prev.lng,
          resolved.lat,
          resolved.lng
        )
        travel_time_minutes = estimateWalkingMinutes(distance_from_previous_km)
      }
    }

    let open_during_slot: boolean | null = null
    if (input.scheduled_date && input.scheduled_slot) {
      open_during_slot = isOpenDuringSlot(
        resolved.opening_hours,
        input.scheduled_date,
        input.scheduled_slot
      )
    }

    const slot = input.scheduled_slot
    const slot_conflict =
      slot !== undefined && slotsWithConflict.has(slot)

    return {
      open_during_slot,
      distance_from_previous_km,
      travel_time_minutes,
      slot_conflict,
      energy_sequence: [...energies],
    }
  })
}

// ---------------------------------------------------------------------------
// Trip date enumeration (inclusive ISO range)
// ---------------------------------------------------------------------------

function addDaysIsoUtc(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Inclusive YYYY-MM-DD range; empty if start > end. */
export function enumerateTripDates(tripStart: string, tripEnd: string): string[] {
  if (tripStart > tripEnd) return []
  const out: string[] = []
  let cur = tripStart
  while (cur <= tripEnd) {
    out.push(cur)
    const next = addDaysIsoUtc(cur, 1)
    if (next <= cur) break
    cur = next
  }
  return out
}

export function slotOccupancyKey(date: string, slot: PlannerSlot): string {
  return `${date}\0${slot}`
}

const WALK_WARNING_MIN_MINUTES = 25

/**
 * Distinct scheduled dates on OK rows, empty slots in trip range, and deterministic warnings.
 */
export function computeTripSummary(
  rows: PreviewRow[],
  tripStartDate: string | undefined,
  tripEndDate: string | undefined
): TripSummary {
  const okWithDate = rows.filter(
    (r) => r.status === 'ok' && r.resolved && r.input.scheduled_date
  )
  const total_days = new Set(
    okWithDate.map((r) => r.input.scheduled_date as string)
  ).size

  const occupied = new Set<string>()
  for (const r of rows) {
    if (r.status !== 'ok' || !r.resolved) continue
    const d = r.input.scheduled_date
    const s = r.input.scheduled_slot
    if (d && s) {
      occupied.add(slotOccupancyKey(d, s))
    }
  }

  let empty_slots: { date: string; slot: PlannerSlot }[] = []
  if (tripStartDate !== undefined && tripEndDate !== undefined) {
    const dates = enumerateTripDates(tripStartDate, tripEndDate)
    for (const date of dates) {
      for (const slot of PLANNER_SLOT_ORDER) {
        if (!occupied.has(slotOccupancyKey(date, slot))) {
          empty_slots.push({ date, slot })
        }
      }
    }
  }

  const warningsSet = new Set<string>()

  for (const { date, slot } of empty_slots) {
    warningsSet.add(`Day ${date} has no ${slot} activity`)
  }

  const byDateOk = new Map<string, PreviewRow[]>()
  for (const r of rows) {
    if (r.status !== 'ok' || !r.resolved) continue
    const d = r.input.scheduled_date
    if (!d) continue
    const arr = byDateOk.get(d) ?? []
    arr.push(r)
    byDateOk.set(d, arr)
  }

  for (const [, bucket] of byDateOk) {
    const sorted = [...bucket].sort((a, b) => {
      const sa = a.input.scheduled_slot
      const sb = b.input.scheduled_slot
      const ia = sa !== undefined ? PLANNER_SLOT_ORDER.indexOf(sa) : 999
      const ib = sb !== undefined ? PLANNER_SLOT_ORDER.indexOf(sb) : 999
      return ia - ib
    })

    let runHigh = 0
    for (const r of sorted) {
      if (r.resolved?.energy === 'High') {
        runHigh += 1
        if (runHigh >= 3) {
          const day = r.input.scheduled_date
          if (day) {
            warningsSet.add(`3 consecutive high-energy items on ${day}`)
          }
          break
        }
      } else {
        runHigh = 0
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      const t = sorted[i].computed?.travel_time_minutes
      if (t === null || t === undefined) continue
      if (t < WALK_WARNING_MIN_MINUTES) continue
      const a = sorted[i - 1].resolved?.place_name
      const b = sorted[i].resolved?.place_name
      if (a && b) {
        warningsSet.add(`${t} min walk between ${a} and ${b}`)
      }
    }
  }

  for (const r of rows) {
    if (r.status !== 'ok' || !r.resolved || !r.computed) continue
    if (r.computed.open_during_slot !== false) continue
    const day = r.input.scheduled_date
    const slot = r.input.scheduled_slot
    if (!day || !slot) continue
    warningsSet.add(
      `${r.resolved.place_name} may be closed during the ${slot} slot on ${day}`
    )
  }

  return {
    total_days,
    empty_slots,
    warnings: [...warningsSet],
  }
}

function slotSortIndex(slot: PlannerSlot | undefined): number {
  if (slot === undefined) return 999
  const i = PLANNER_SLOT_ORDER.indexOf(slot)
  return i < 0 ? 999 : i
}

/**
 * Sets `computed` on each preview row: null unless status is ok with resolved enrichment.
 */
export function hydrateImportPreviewComputed(rows: PreviewRow[]): void {
  for (const r of rows) {
    if (r.status !== 'ok' || !r.resolved) {
      r.computed = null
    }
  }

  for (const r of rows) {
    if (r.status !== 'ok' || !r.resolved) continue
    if (!r.input.scheduled_date) {
      r.computed = {
        open_during_slot: null,
        distance_from_previous_km: null,
        travel_time_minutes: null,
        slot_conflict: false,
        energy_sequence: [r.resolved.energy],
      }
    }
  }

  const byDate = new Map<string, PreviewRow[]>()
  for (const r of rows) {
    const d = r.input.scheduled_date
    if (!d) continue
    const arr = byDate.get(d) ?? []
    arr.push(r)
    byDate.set(d, arr)
  }

  for (const [, bucket] of byDate) {
    const slotCounts = new Map<PlannerSlot, number>()
    for (const r of bucket) {
      const s = r.input.scheduled_slot
      if (!s) continue
      slotCounts.set(s, (slotCounts.get(s) ?? 0) + 1)
    }
    const slotsWithConflict = new Set<PlannerSlot>()
    for (const [s, c] of slotCounts) {
      if (c > 1) slotsWithConflict.add(s)
    }

    const okDay = bucket.filter((r) => r.status === 'ok' && r.resolved)
    okDay.sort((a, b) => slotSortIndex(a.input.scheduled_slot) - slotSortIndex(b.input.scheduled_slot))

    const forCompute = okDay.map((r) => ({
      resolved: r.resolved!,
      input: r.input,
    }))
    const fields = computeFieldsForDay(forCompute, slotsWithConflict)
    for (let i = 0; i < okDay.length; i++) {
      okDay[i].computed = fields[i]
    }
  }
}
