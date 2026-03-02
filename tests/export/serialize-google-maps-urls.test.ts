import { describe, expect, it } from 'vitest'
import { serializeGoogleMapsUrls } from '@/lib/export/serialize-google-maps-urls'
import type { ExportRow } from '@/lib/export/contract'

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    place_name: 'Lilia',
    place_category: 'Food',
    place_energy: null,
    place_address: null,
    place_neighborhood: null,
    place_user_notes: null,
    place_user_tags: [],
    place_lat: null,
    place_lng: null,
    google_maps_url: null,
    website: null,
    item_tags: [],
    scheduled_date: null,
    scheduled_slot: null,
    status: 'backlog',
    ...overrides,
  }
}

describe('serializeGoogleMapsUrls', () => {
  it('returns the pre-resolved google_maps_url', () => {
    const urls = serializeGoogleMapsUrls([
      makeRow({ google_maps_url: 'https://maps.example.com/lilia' }),
    ])
    expect(urls).toEqual(['https://maps.example.com/lilia'])
  })

  it('falls back to lat/lng URL when no google_maps_url', () => {
    const urls = serializeGoogleMapsUrls([
      makeRow({ google_maps_url: null, place_lat: 40.714, place_lng: -73.951 }),
    ])
    expect(urls).toEqual([
      'https://www.google.com/maps/search/?api=1&query=40.714,-73.951',
    ])
  })

  it('skips places with no URL and no coordinates', () => {
    const urls = serializeGoogleMapsUrls([
      makeRow({ google_maps_url: null, place_lat: null, place_lng: null }),
    ])
    expect(urls).toEqual([])
  })

  it('returns one URL per place', () => {
    const rows = [
      makeRow({ google_maps_url: 'https://maps.example.com/a' }),
      makeRow({ google_maps_url: 'https://maps.example.com/b' }),
    ]
    const urls = serializeGoogleMapsUrls(rows)
    expect(urls).toHaveLength(2)
  })

  it('returns empty array for empty rows', () => {
    expect(serializeGoogleMapsUrls([])).toEqual([])
  })
})
