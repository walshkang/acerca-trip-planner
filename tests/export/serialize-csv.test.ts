import { describe, expect, it } from 'vitest'
import { serializeCsv } from '@/lib/export/serialize-csv'
import type { ExportRow } from '@/lib/export/contract'

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    place_name: 'Lilia',
    place_category: 'Food',
    place_energy: 'Medium',
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

describe('serializeCsv', () => {
  it('includes correct headers on the first line', () => {
    const csv = serializeCsv([])
    const firstLine = csv.split('\r\n')[0]
    expect(firstLine).toBe(
      'Name,Category,Energy,Neighborhood,Address,Place Tags,Item Tags,Day,Slot,Status,Google Maps,Website,Notes,Lat,Lng'
    )
  })

  it('serializes a basic row', () => {
    const csv = serializeCsv([makeRow()])
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(2) // header + 1 row
    expect(lines[1]).toContain('Lilia')
    expect(lines[1]).toContain('Food')
  })

  it('uses CRLF line endings', () => {
    const csv = serializeCsv([makeRow()])
    expect(csv).toContain('\r\n')
  })

  it('quotes fields containing commas', () => {
    const csv = serializeCsv([makeRow({ place_name: 'Café, LLC' })])
    expect(csv).toContain('"Café, LLC"')
  })

  it('escapes double-quotes by doubling them', () => {
    const csv = serializeCsv([makeRow({ place_user_notes: 'She said "go early"' })])
    expect(csv).toContain('"She said ""go early"""')
  })

  it('serializes tags as semicolon-separated', () => {
    const csv = serializeCsv([
      makeRow({ place_user_tags: ['pasta', 'romantic'], item_tags: ['must-try'] }),
    ])
    expect(csv).toContain('pasta;romantic')
    expect(csv).toContain('must-try')
  })

  it('serializes slot as human label', () => {
    const csv = serializeCsv([
      makeRow({ scheduled_slot: 'morning', scheduled_date: '2026-03-10', status: 'scheduled' }),
    ])
    expect(csv).toContain('Morning')
  })

  it('handles null/empty values gracefully', () => {
    const csv = serializeCsv([
      makeRow({
        place_energy: null,
        place_neighborhood: null,
        google_maps_url: null,
        place_lat: null,
        place_lng: null,
      }),
    ])
    // Should not throw; lat/lng columns should be empty
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    // Lat/Lng columns are last two; they should be empty
    const cols = lines[1].split(',')
    expect(cols[cols.length - 2]).toBe('')
    expect(cols[cols.length - 1]).toBe('')
  })
})
