import { describe, expect, it } from 'vitest'
import { googleMapsUrl } from '@/lib/export/google-maps-url'

describe('googleMapsUrl', () => {
  it('returns a place_id URL when google_place_id is provided', () => {
    const url = googleMapsUrl({
      google_place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
      lat: 40.7,
      lng: -74.0,
    })
    expect(url).toBe(
      'https://www.google.com/maps/place/?q=place_id:ChIJ2eUgeAK6j4ARbn5u_wAGqWA'
    )
  })

  it('prefers place_id over lat/lng', () => {
    const url = googleMapsUrl({
      google_place_id: 'some-id',
      lat: 40.7,
      lng: -74.0,
    })
    expect(url).toContain('place_id:some-id')
  })

  it('falls back to lat/lng search when no place_id', () => {
    const url = googleMapsUrl({ google_place_id: null, lat: 40.7128, lng: -74.006 })
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=40.7128,-74.006'
    )
  })

  it('returns null when no place_id and no lat/lng', () => {
    expect(googleMapsUrl({ google_place_id: null, lat: null, lng: null })).toBeNull()
  })

  it('returns null when lat is null but lng is present', () => {
    expect(googleMapsUrl({ google_place_id: null, lat: null, lng: -74.0 })).toBeNull()
  })

  it('returns null when lng is null but lat is present', () => {
    expect(googleMapsUrl({ google_place_id: null, lat: 40.7, lng: null })).toBeNull()
  })
})
