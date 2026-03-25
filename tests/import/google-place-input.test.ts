import { describe, expect, it } from 'vitest'
import {
  looksLikeGooglePlaceId,
  parsePlaceIdFromGoogleMapsUrl,
} from '@/lib/places/google-place-input'

describe('parsePlaceIdFromGoogleMapsUrl', () => {
  it('reads place_id query param', () => {
    expect(
      parsePlaceIdFromGoogleMapsUrl(
        'https://www.google.com/maps?place_id=ChIJxxxxxxxxxxxxxxxx'
      )
    ).toBe('ChIJxxxxxxxxxxxxxxxx')
  })

  it('reads query_place_id', () => {
    expect(
      parsePlaceIdFromGoogleMapsUrl(
        'https://www.google.com/maps?query_place_id=ChIJyyyyyyyyyyyyyyyy'
      )
    ).toBe('ChIJyyyyyyyyyyyyyyyy')
  })

  it('returns null for non-ChIJ q', () => {
    expect(
      parsePlaceIdFromGoogleMapsUrl('https://www.google.com/maps?q=Paris')
    ).toBeNull()
  })

  it('returns null for invalid URL', () => {
    expect(parsePlaceIdFromGoogleMapsUrl('not a url')).toBeNull()
  })
})

describe('looksLikeGooglePlaceId', () => {
  it('accepts ChIJ in length range', () => {
    const id = 'ChIJ' + 'x'.repeat(20)
    expect(looksLikeGooglePlaceId(id)).toBe(true)
    expect(looksLikeGooglePlaceId(`  ${id}  `)).toBe(true)
  })

  it('rejects too short', () => {
    expect(looksLikeGooglePlaceId('ChIJshort')).toBe(false)
  })

  it('rejects non-ChIJ prefix', () => {
    expect(looksLikeGooglePlaceId('Eixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(
      false
    )
  })
})
