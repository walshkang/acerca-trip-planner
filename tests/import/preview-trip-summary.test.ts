import { describe, expect, it } from 'vitest'
import type { PreviewRow } from '@/lib/import/contract'
import {
  computeImportPreviewTripSummary,
  enumerateTripDates,
} from '@/lib/import/preview-trip-summary'

const stubResolved = {
  place_name: 'Place',
  google_place_id: 'ChIJxxxxxxxxxxxxxxxx',
  neighborhood: null,
  lat: 1,
  lng: 2,
  google_rating: null,
  google_price_level: null,
  google_review_count: null,
  opening_hours: null,
  energy: 'Medium' as const,
  category: 'Food' as const,
  website: null,
  google_maps_url: 'https://www.google.com/maps/',
}

function okRow(
  row_index: number,
  scheduled_date?: string,
  scheduled_slot?: 'morning' | 'afternoon' | 'evening'
): PreviewRow {
  return {
    row_index,
    status: 'ok',
    error_message: null,
    candidates: null,
    input: {
      place_name: 'X',
      ...(scheduled_date !== undefined ? { scheduled_date } : {}),
      ...(scheduled_slot !== undefined ? { scheduled_slot } : {}),
    },
    resolved: stubResolved,
    computed: null,
  }
}

describe('enumerateTripDates', () => {
  it('returns empty when start > end', () => {
    expect(enumerateTripDates('2026-04-05', '2026-04-01')).toEqual([])
  })

  it('returns single day inclusive', () => {
    expect(enumerateTripDates('2026-04-01', '2026-04-01')).toEqual(['2026-04-01'])
  })

  it('enumerates inclusive range', () => {
    expect(enumerateTripDates('2026-04-01', '2026-04-03')).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ])
  })
})

describe('computeImportPreviewTripSummary', () => {
  it('counts distinct scheduled_date on ok rows only', () => {
    const rows: PreviewRow[] = [
      okRow(0, '2026-04-01', 'morning'),
      okRow(1, '2026-04-01', 'afternoon'),
      okRow(2, '2026-04-02', 'morning'),
      {
        row_index: 3,
        status: 'error',
        error_message: 'fail',
        candidates: null,
        input: { place_name: 'bad', scheduled_date: '2026-04-99' },
        resolved: null,
        computed: null,
      },
    ]
    const s = computeImportPreviewTripSummary(rows, undefined, undefined)
    expect(s.total_days).toBe(2)
    expect(s.empty_slots).toEqual([])
    expect(s.warnings).toEqual([])
  })

  it('computes empty_slots from trip bounds and occupied ok rows', () => {
    const rows: PreviewRow[] = [
      okRow(0, '2026-04-01', 'morning'),
      okRow(1, '2026-04-01', 'evening'),
    ]
    const s = computeImportPreviewTripSummary(
      rows,
      '2026-04-01',
      '2026-04-02'
    )
    expect(s.total_days).toBe(1)
    const keys = s.empty_slots.map((x) => `${x.date}:${x.slot}`)
    expect(keys).toContain('2026-04-01:afternoon')
    expect(keys).toContain('2026-04-02:morning')
    expect(keys).not.toContain('2026-04-01:morning')
    expect(keys).not.toContain('2026-04-01:evening')
  })

  it('skips empty_slots when trip dates omitted', () => {
    const rows: PreviewRow[] = [okRow(0, '2026-04-01', 'morning')]
    const s = computeImportPreviewTripSummary(rows, undefined, '2026-04-03')
    expect(s.empty_slots).toEqual([])
  })
})
