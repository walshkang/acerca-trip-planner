import type { DiscoverySuggestion } from '@/lib/discovery/contract'

export type DiscoveryUiResult = {
  place_id: string
  source: DiscoverySuggestion['source']
  source_id: string
  matched_place_id: string | null
  canonical_place_id: string | null
  name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  neighborhood: string | null
  borough: string | null
  score: number
  rank: number
  reasons: string[]
}

function resolveCanonicalPlaceId(suggestion: DiscoverySuggestion): string | null {
  if (suggestion.matched_place_id) {
    return suggestion.matched_place_id
  }
  if (suggestion.source === 'places_index') {
    return suggestion.source_id
  }
  return null
}

export function mapDiscoverySuggestionToUiResult(
  suggestion: DiscoverySuggestion
): DiscoveryUiResult {
  return {
    place_id: suggestion.source_id,
    source: suggestion.source,
    source_id: suggestion.source_id,
    matched_place_id: suggestion.matched_place_id,
    canonical_place_id: resolveCanonicalPlaceId(suggestion),
    name: suggestion.name,
    address: suggestion.address,
    lat: suggestion.lat,
    lng: suggestion.lng,
    neighborhood: suggestion.neighborhood,
    borough: suggestion.borough,
    score: suggestion.score,
    rank: suggestion.rank,
    reasons: [...suggestion.reasons],
  }
}

export function mapDiscoverySuggestionsToUiResults(
  suggestions: DiscoverySuggestion[]
): DiscoveryUiResult[] {
  return suggestions.map(mapDiscoverySuggestionToUiResult)
}

export function isCanonicalRow(result: DiscoveryUiResult): boolean {
  return Boolean(result.canonical_place_id)
}
