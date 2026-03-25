import { describe, expect, it } from 'vitest'
import type { ImportRow, PreviewRow, ResolvedEnrichment } from '@/lib/import/contract'
import {
  computeFieldsForDay,
  computeTripSummary,
  estimateWalkingMinutes,
  haversineDistanceKm,
  hydrateImportPreviewComputed,
  isOpenDuringSlot,
  parseGoogleOpeningHours,
} from '@/lib/import/compute'

const baseResolved = (over: Partial<ResolvedEnrichment> = {}): ResolvedEnrichment => ({
  place_name: 'Place',
  google_place_id: 'ChIJxxxxxxxxxxxxxxxx',
  neighborhood: null,
  lat: 13.7466,
  lng: 100.4925,
  google_rating: null,
  google_price_level: null,
  google_review_count: null,
  opening_hours: null,
  energy: 'Medium',
  category: 'Food',
  website: null,
  google_maps_url: 'https://www.google.com/maps/',
  ...over,
})

function row(
  row_index: number,
  input: ImportRow,
  status: PreviewRow['status'],
  resolved: ResolvedEnrichment | null
): PreviewRow {
  return {
    row_index,
    status,
    error_message: status === 'error' ? 'x' : null,
    candidates: null,
    input,
    resolved,
    computed: null,
  }
}

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm(10, 20, 10, 20)).toBe(0)
  })

  it('matches ~1 km east at the equator', () => {
    const km = haversineDistanceKm(0, 0, 0, 0.00898315)
    expect(km).toBeCloseTo(1, 1)
  })

  it('Wat Pho to Chatuchak is a plausible Bangkok hop', () => {
    const watPho = { lat: 13.7466, lng: 100.4925 }
    const chatuchak = { lat: 13.7998, lng: 100.5503 }
    const km = haversineDistanceKm(watPho.lat, watPho.lng, chatuchak.lat, chatuchak.lng)
    expect(km).toBeGreaterThan(7)
    expect(km).toBeLessThan(10)
    expect(km).toBe(Math.round(km * 100) / 100)
  })
})

describe('estimateWalkingMinutes', () => {
  it('uses 5 km/h walking speed', () => {
    expect(estimateWalkingMinutes(5)).toBe(60)
    expect(estimateWalkingMinutes(1)).toBe(12)
  })
})

describe('parseGoogleOpeningHours', () => {
  it('parses a normal range with en dash', () => {
    const p = parseGoogleOpeningHours(['Monday: 9:00 AM – 10:00 PM'])
    expect(p).toEqual([
      expect.objectContaining({ day: 1, open: 9 * 60, close: 22 * 60, closed: false }),
    ])
  })

  it('parses hyphen dash', () => {
    const p = parseGoogleOpeningHours(['Tuesday: 9:00 AM - 5:00 PM'])
    expect(p[0]).toMatchObject({ day: 2, open: 9 * 60, close: 17 * 60, closed: false })
  })

  it('parses Closed', () => {
    const p = parseGoogleOpeningHours(['Sunday: Closed'])
    expect(p[0]).toMatchObject({ day: 0, closed: true })
  })

  it('parses Open 24 hours', () => {
    const p = parseGoogleOpeningHours(['Wednesday: Open 24 hours'])
    expect(p[0]).toMatchObject({ day: 3, closed: false, open: 0, close: 24 * 60 })
  })

  it('returns empty on malformed input', () => {
    expect(parseGoogleOpeningHours(['Monday: nonsense'])).toEqual([])
    expect(parseGoogleOpeningHours(['noday: 9:00 AM – 5:00 PM'])).toEqual([])
  })
})

describe('isOpenDuringSlot', () => {
  const wedMorning = '2026-04-01'
  const hoursWed = [
    'Monday: Closed',
    'Tuesday: Closed',
    'Wednesday: 9:00 AM – 10:00 PM',
    'Thursday: Closed',
    'Friday: Closed',
    'Saturday: Closed',
    'Sunday: Closed',
  ]

  it('returns null when hours missing', () => {
    expect(isOpenDuringSlot(null, wedMorning, 'morning')).toBeNull()
  })

  it('returns true when open through the slot', () => {
    expect(isOpenDuringSlot(hoursWed, wedMorning, 'morning')).toBe(true)
  })

  it('returns false when closed that day', () => {
    const hours = hoursWed.map((h) =>
      h.startsWith('Wednesday:') ? 'Wednesday: Closed' : h
    )
    expect(isOpenDuringSlot(hours, wedMorning, 'morning')).toBe(false)
  })

  it('returns true for Open 24 hours', () => {
    const hours = hoursWed.map((h) =>
      h.startsWith('Wednesday:') ? 'Wednesday: Open 24 hours' : h
    )
    expect(isOpenDuringSlot(hours, wedMorning, 'evening')).toBe(true)
  })
})

describe('computeFieldsForDay', () => {
  const date = '2026-04-01'
  const r1 = baseResolved({
    place_name: 'A',
    lat: 0,
    lng: 0,
    energy: 'High',
    opening_hours: ['Wednesday: 9:00 AM – 12:00 PM'],
  })
  const r2 = baseResolved({
    place_name: 'B',
    lat: 0,
    lng: 0.009,
    energy: 'High',
    opening_hours: ['Wednesday: 9:00 AM – 12:00 PM'],
  })
  const r3 = baseResolved({
    place_name: 'C',
    lat: 0,
    lng: 0.018,
    energy: 'Medium',
    opening_hours: ['Wednesday: 5:00 PM – 10:00 PM'],
  })

  it('chains distances, detects slot conflict, builds energy sequence', () => {
    const rows = [
      {
        resolved: r1,
        input: {
          place_name: 'a',
          scheduled_date: date,
          scheduled_slot: 'morning' as const,
        },
      },
      {
        resolved: r2,
        input: {
          place_name: 'b',
          scheduled_date: date,
          scheduled_slot: 'morning' as const,
        },
      },
      {
        resolved: r3,
        input: {
          place_name: 'c',
          scheduled_date: date,
          scheduled_slot: 'evening' as const,
        },
      },
    ]
    const slotsWithConflict = new Set<'morning' | 'afternoon' | 'evening'>(['morning'])
    const out = computeFieldsForDay(rows, slotsWithConflict)
    expect(out[0].distance_from_previous_km).toBeNull()
    expect(out[0].slot_conflict).toBe(true)
    expect(out[0].energy_sequence).toEqual(['High'])
    expect(out[1].distance_from_previous_km).not.toBeNull()
    expect(out[1].travel_time_minutes).toBe(
      estimateWalkingMinutes(out[1].distance_from_previous_km as number)
    )
    expect(out[1].slot_conflict).toBe(true)
    expect(out[1].energy_sequence).toEqual(['High', 'High'])
    expect(out[2].slot_conflict).toBe(false)
    expect(out[2].energy_sequence).toEqual(['High', 'High', 'Medium'])
    expect(out[2].open_during_slot).toBe(true)
  })
})

describe('computeTripSummary', () => {
  it('counts days, empty_slots, and adds empty-slot warnings', () => {
    const rows: PreviewRow[] = [
      row(
        0,
        { place_name: 'a', scheduled_date: '2026-04-01', scheduled_slot: 'morning' },
        'ok',
        baseResolved()
      ),
      row(
        1,
        { place_name: 'b', scheduled_date: '2026-04-01', scheduled_slot: 'evening' },
        'ok',
        baseResolved()
      ),
    ]
    hydrateImportPreviewComputed(rows)
    const s = computeTripSummary(rows, '2026-04-01', '2026-04-02')
    expect(s.total_days).toBe(1)
    expect(s.empty_slots.map((x) => `${x.date}:${x.slot}`)).toContain('2026-04-01:afternoon')
    expect(
      s.warnings.some((w) => w.includes('2026-04-01') && w.includes('afternoon'))
    ).toBe(true)
  })

  it('warns when a place may be closed during the scheduled slot', () => {
    const rows: PreviewRow[] = [
      row(
        0,
        { place_name: 'a', scheduled_date: '2026-04-01', scheduled_slot: 'morning' },
        'ok',
        baseResolved({
          place_name: 'Chatuchak Weekend Market',
          opening_hours: ['Wednesday: 5:00 PM – 10:00 PM'],
        })
      ),
    ]
    hydrateImportPreviewComputed(rows)
    const s = computeTripSummary(rows, undefined, undefined)
    expect(
      s.warnings.some((w) =>
        w.includes('Chatuchak Weekend Market') &&
        w.includes('morning') &&
        w.includes('2026-04-01')
      )
    ).toBe(true)
  })

  it('warns on long walks between consecutive stops', () => {
    const far = baseResolved({
      place_name: 'Far Spot',
      lat: 13.78,
      lng: 100.4925,
    })
    const rows: PreviewRow[] = [
      row(
        0,
        { place_name: 'a', scheduled_date: '2026-04-01', scheduled_slot: 'morning' },
        'ok',
        baseResolved({ place_name: 'Wat Pho', lat: 13.7466, lng: 100.4925 })
      ),
      row(
        1,
        { place_name: 'b', scheduled_date: '2026-04-01', scheduled_slot: 'afternoon' },
        'ok',
        far
      ),
    ]
    hydrateImportPreviewComputed(rows)
    const s = computeTripSummary(rows, undefined, undefined)
    expect(
      s.warnings.some(
        (w) =>
          w.includes('walk between') &&
          w.includes('Wat Pho') &&
          w.includes('Far Spot')
      )
    ).toBe(true)
  })

  it('warns on three consecutive high-energy items', () => {
    const rows: PreviewRow[] = [
      row(
        0,
        { place_name: 'a', scheduled_date: '2026-04-01', scheduled_slot: 'morning' },
        'ok',
        baseResolved({ energy: 'High' })
      ),
      row(
        1,
        { place_name: 'b', scheduled_date: '2026-04-01', scheduled_slot: 'afternoon' },
        'ok',
        baseResolved({ energy: 'High' })
      ),
      row(
        2,
        { place_name: 'c', scheduled_date: '2026-04-01', scheduled_slot: 'evening' },
        'ok',
        baseResolved({ energy: 'High' })
      ),
    ]
    hydrateImportPreviewComputed(rows)
    const s = computeTripSummary(rows, undefined, undefined)
    expect(s.warnings.some((w) => w.includes('3 consecutive high-energy'))).toBe(true)
  })
})

describe('hydrateImportPreviewComputed', () => {
  it('sets computed null for non-ok rows', () => {
    const rows: PreviewRow[] = [
      row(0, { place_name: 'x', scheduled_date: '2026-04-01', scheduled_slot: 'morning' }, 'error', null),
    ]
    hydrateImportPreviewComputed(rows)
    expect(rows[0].computed).toBeNull()
  })

  it('ok row without date gets minimal computed', () => {
    const rows: PreviewRow[] = [
      row(0, { place_name: 'x' }, 'ok', baseResolved({ energy: 'Low' })),
    ]
    hydrateImportPreviewComputed(rows)
    expect(rows[0].computed).toMatchObject({
      slot_conflict: false,
      distance_from_previous_km: null,
      energy_sequence: ['Low'],
    })
  })
})
