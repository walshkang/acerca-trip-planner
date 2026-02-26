import { describe, expect, it } from 'vitest'
import type { DiscoverySuggestion } from '@/lib/discovery/contract'
import { emptyCanonicalServerFilters } from '@/lib/filters/schema'
import { buildDiscoverySummary } from '@/lib/server/discovery/summary'

function makeSuggestion(
  overrides: Partial<DiscoverySuggestion> = {}
): DiscoverySuggestion {
  return {
    source: 'places_index',
    source_id: 'place-1',
    name: 'Alpha',
    address: '1 Main St',
    lat: 40.7,
    lng: -73.9,
    neighborhood: 'West Village',
    borough: 'Manhattan',
    matched_place_id: 'place-1',
    score: 100,
    rank: 1,
    reasons: ['places_index'],
    ...overrides,
  }
}

describe('buildDiscoverySummary', () => {
  it('returns null when includeSummary is false', () => {
    const summary = buildDiscoverySummary({
      includeSummary: false,
      intent: 'coffee',
      filters: emptyCanonicalServerFilters(),
      suggestions: [makeSuggestion()],
    })

    expect(summary).toBeNull()
  })

  it('returns deterministic fallback metadata and summary text', () => {
    const summary = buildDiscoverySummary({
      includeSummary: true,
      intent: 'date night',
      filters: emptyCanonicalServerFilters(),
      suggestions: [
        makeSuggestion({ source_id: 'place-1', name: 'Alpha Spot' }),
        makeSuggestion({ source_id: 'place-2', name: 'Beta Spot', rank: 2 }),
      ],
    })

    expect(summary).toEqual({
      text: 'Top suggestions for "date night" are Alpha Spot, Beta Spot.',
      model: 'deterministic-fallback',
      promptVersion: 'discovery-summary-fallback-v1',
      usedFallback: true,
    })
  })

  it('appends category and open-now filter hints when present', () => {
    const summary = buildDiscoverySummary({
      includeSummary: true,
      intent: 'late drinks',
      filters: {
        ...emptyCanonicalServerFilters(),
        category: ['Drinks'],
        open_now: true,
      },
      suggestions: [makeSuggestion({ name: 'Night Owl Bar' })],
    })

    expect(summary?.text).toContain('Categories: Drinks.')
    expect(summary?.text).toContain('Open-now filter is active.')
  })

  it('does not mutate ranked suggestions input', () => {
    const suggestions = [
      makeSuggestion({ source_id: 'place-1', name: '  Alpha Spot  ' }),
      makeSuggestion({ source_id: 'place-2', name: null, rank: 2 }),
    ]
    const before = JSON.parse(JSON.stringify(suggestions)) as DiscoverySuggestion[]

    const summary = buildDiscoverySummary({
      includeSummary: true,
      intent: 'walkable lunch',
      filters: emptyCanonicalServerFilters(),
      suggestions,
    })

    expect(summary).not.toBeNull()
    expect(suggestions).toEqual(before)
  })
})
