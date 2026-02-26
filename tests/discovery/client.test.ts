import { describe, expect, it } from 'vitest'
import type { DiscoverySuggestion } from '@/lib/discovery/contract'
import {
  isCanonicalRow,
  mapDiscoverySuggestionToUiResult,
  mapDiscoverySuggestionsToUiResults,
} from '@/lib/discovery/client'

function makeSuggestion(
  overrides: Partial<DiscoverySuggestion> = {}
): DiscoverySuggestion {
  return {
    source: 'google_search',
    source_id: 'google-1',
    name: 'Alpha Spot',
    address: '1 Main St',
    lat: 40.7,
    lng: -73.9,
    neighborhood: 'West Village',
    borough: 'Manhattan',
    matched_place_id: null,
    score: 1000,
    rank: 1,
    reasons: ['google_search'],
    ...overrides,
  }
}

describe('discovery client mapping', () => {
  it('maps places_index suggestions as canonical rows', () => {
    const row = mapDiscoverySuggestionToUiResult(
      makeSuggestion({
        source: 'places_index',
        source_id: 'place-123',
        matched_place_id: null,
      })
    )

    expect(row.place_id).toBe('place-123')
    expect(row.canonical_place_id).toBe('place-123')
    expect(isCanonicalRow(row)).toBe(true)
  })

  it('maps matched google suggestions as canonical rows', () => {
    const row = mapDiscoverySuggestionToUiResult(
      makeSuggestion({
        source: 'google_search',
        source_id: 'google-abc',
        matched_place_id: 'place-789',
      })
    )

    expect(row.place_id).toBe('google-abc')
    expect(row.canonical_place_id).toBe('place-789')
    expect(isCanonicalRow(row)).toBe(true)
  })

  it('maps unmatched google suggestions as preview rows', () => {
    const row = mapDiscoverySuggestionToUiResult(
      makeSuggestion({
        source: 'google_search',
        source_id: 'google-new',
        matched_place_id: null,
      })
    )

    expect(row.place_id).toBe('google-new')
    expect(row.canonical_place_id).toBeNull()
    expect(isCanonicalRow(row)).toBe(false)
  })

  it('preserves order and stable identifiers for mixed suggestions', () => {
    const rows = mapDiscoverySuggestionsToUiResults([
      makeSuggestion({
        source: 'places_index',
        source_id: 'place-1',
        score: 2000,
        rank: 1,
      }),
      makeSuggestion({
        source: 'google_search',
        source_id: 'google-1',
        matched_place_id: 'place-2',
        score: 1500,
        rank: 2,
      }),
      makeSuggestion({
        source: 'google_search',
        source_id: 'google-2',
        matched_place_id: null,
        score: 1200,
        rank: 3,
      }),
    ])

    expect(rows.map((row) => row.place_id)).toEqual([
      'place-1',
      'google-1',
      'google-2',
    ])
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3])
  })
})
