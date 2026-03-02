import { describe, expect, it } from 'vitest'
import { serializeClipboard } from '@/lib/export/serialize-clipboard'
import type { ExportRow } from '@/lib/export/contract'

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    place_name: 'Lilia',
    place_category: 'Food',
    place_energy: null,
    place_address: '567 Union Ave, Williamsburg, Brooklyn, NY 11211',
    place_neighborhood: 'Williamsburg',
    place_user_notes: null,
    place_user_tags: [],
    place_lat: 40.714,
    place_lng: -73.951,
    google_maps_url: 'https://maps.example.com/lilia',
    website: null,
    item_tags: [],
    scheduled_date: null,
    scheduled_slot: null,
    status: 'backlog',
    ...overrides,
  }
}

const LIST = { name: 'Brooklyn Trip', start_date: '2026-03-10', end_date: '2026-03-17' }

describe('serializeClipboard', () => {
  it('includes list name and date range in the header', () => {
    const text = serializeClipboard([makeRow()], LIST)
    expect(text).toContain('🗺️ Brooklyn Trip')
    expect(text).toContain('Mar 10')
    expect(text).toContain('17')
  })

  it('uses just name when no dates', () => {
    const text = serializeClipboard([makeRow()], {
      name: 'My List',
      start_date: null,
      end_date: null,
    })
    expect(text).toContain('🗺️ My List')
    expect(text).not.toContain('(')
  })

  it('groups places by neighborhood', () => {
    const rows = [
      makeRow({ place_name: 'Lilia', place_neighborhood: 'Williamsburg' }),
      makeRow({
        place_name: 'Karczma',
        place_neighborhood: 'Greenpoint',
        place_category: 'Food',
        google_maps_url: 'https://maps.example.com/karczma',
      }),
    ]
    const text = serializeClipboard(rows, LIST)
    expect(text).toContain('📍 Williamsburg')
    expect(text).toContain('📍 Greenpoint')
  })

  it('uses "Unknown Neighborhood" for places with no neighborhood', () => {
    const row = makeRow({ place_neighborhood: null })
    const text = serializeClipboard([row], LIST)
    expect(text).toContain('📍 Unknown Neighborhood')
  })

  it('includes place name with category emoji', () => {
    const text = serializeClipboard([makeRow()], LIST)
    expect(text).toContain('🍽️ Lilia — Food')
  })

  it('includes Google Maps URL on its own line', () => {
    const text = serializeClipboard([makeRow()], LIST)
    const lines = text.split('\n')
    expect(lines.some((l) => l.trim() === 'https://maps.example.com/lilia')).toBe(true)
  })

  it('includes footer with place count and category breakdown', () => {
    const rows = [
      makeRow({ place_category: 'Food' }),
      makeRow({ place_name: 'Devoción', place_category: 'Coffee', google_maps_url: null }),
      makeRow({ place_name: 'Brooklyn Flea', place_category: 'Shop', google_maps_url: null }),
    ]
    const text = serializeClipboard(rows, LIST)
    expect(text).toContain('3 places')
    expect(text).toContain('1 Food')
    expect(text).toContain('1 Coffee')
    expect(text).toContain('1 Shop')
  })

  it('uses singular "place" for a single result', () => {
    const text = serializeClipboard([makeRow()], LIST)
    expect(text).toContain('1 place')
    expect(text).not.toContain('1 places')
  })

  it('returns empty content for zero rows', () => {
    const text = serializeClipboard([], LIST)
    expect(text).toContain('0 places')
  })
})
