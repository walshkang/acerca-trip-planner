import type {
  CanonicalDiscoverySuggestRequest,
  DiscoverySuggestion,
  DiscoverySummary,
} from '@/lib/discovery/contract'
import type { CanonicalServerFilters } from '@/lib/filters/schema'
import { parseServerFilterPayload } from '@/lib/filters/schema'
import { evaluateOpenNowWithResolution } from '@/lib/filters/open-now'
import { lookupNeighborhood } from '@/lib/geo/nycNeighborhoods'
import {
  SourceFetchError,
  searchGooglePlaces,
  type GooglePlacesTextCandidate,
} from '@/lib/enrichment/sources'
import {
  normalizeLocalSearchQuery,
  rankLocalSearchMatch,
  resolveCategoryMatch,
} from '@/lib/places/local-search'
import { translateIntentToFiltersDeterministic } from '@/lib/server/filters/translate'
import { createClient } from '@/lib/supabase/server'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'

const DISCOVERY_PIPELINE_VERSION = 'discovery-suggest-v1'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type PlaceRecord = {
  id: string
  name: string
  address: string | null
  category: CategoryEnum
  energy: EnergyEnum | null
  opening_hours: unknown | null
  google_place_id: string | null
  name_normalized: string | null
  address_normalized: string | null
}

type ListItemRecord = {
  place_id: string
  tags: string[] | null
  place: PlaceRecord | null
}

type PlaceCoordinateRow = {
  id: string | null
  lat: number | null
  lng: number | null
}

type PlaceCoordinateMap = Map<string, { lat: number | null; lng: number | null }>

type SuggestServiceInput = {
  supabase: SupabaseServerClient
  userId: string
  canonical: CanonicalDiscoverySuggestRequest
}

type SuggestServiceResult = {
  canonicalFilters: CanonicalServerFilters | null
  suggestions: DiscoverySuggestion[]
  summary: DiscoverySummary | null
  meta: {
    retrieved_count: number
    returned_count: number
    pipeline_version: string
  }
}

type SuggestServiceErrorCode =
  | 'not_found'
  | 'provider_unavailable'
  | 'provider_bad_gateway'

export class DiscoverySuggestServiceError extends Error {
  readonly code: SuggestServiceErrorCode
  readonly canonicalRequest: CanonicalDiscoverySuggestRequest

  constructor(
    code: SuggestServiceErrorCode,
    message: string,
    canonicalRequest: CanonicalDiscoverySuggestRequest
  ) {
    super(message)
    this.name = 'DiscoverySuggestServiceError'
    this.code = code
    this.canonicalRequest = canonicalRequest
  }
}

function hasIntersection(values: string[] | null | undefined, expected: string[]): boolean {
  if (!Array.isArray(values) || !values.length || !expected.length) return false
  const set = new Set(values)
  return expected.some((item) => set.has(item))
}

function resolveNeighborhood(
  lat: number | null,
  lng: number | null
): { neighborhood: string | null; borough: string | null } {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { neighborhood: null, borough: null }
  }
  const hit = lookupNeighborhood(lat, lng)
  return {
    neighborhood: hit?.name ?? null,
    borough: hit?.borough ?? null,
  }
}

function applyPlaceFilters(
  place: PlaceRecord,
  filters: CanonicalServerFilters,
  listTimezone: string | null
): boolean {
  if (filters.category.length > 0 && !filters.category.includes(place.category)) {
    return false
  }
  if (filters.energy.length > 0) {
    if (!place.energy || !filters.energy.includes(place.energy)) {
      return false
    }
  }
  if (filters.open_now !== null) {
    const openNow = evaluateOpenNowWithResolution({
      openingHours: place.opening_hours,
      fallbackTimezone: listTimezone,
    }).openNow
    if (openNow !== filters.open_now) {
      return false
    }
  }
  return true
}

function isReadConstrainedByPlaceFilters(filters: CanonicalServerFilters): boolean {
  return (
    filters.category.length > 0 ||
    filters.energy.length > 0 ||
    filters.open_now !== null ||
    filters.tags.length > 0
  )
}

function buildDeterministicSummary(input: {
  intent: string
  filters: CanonicalServerFilters | null
  suggestions: DiscoverySuggestion[]
}): DiscoverySummary {
  const topNames = input.suggestions
    .map((item) => item.name?.trim() ?? '')
    .filter((value) => value.length > 0)
    .slice(0, 3)

  let text = ''
  if (topNames.length === 0) {
    text = `No suggestions matched "${input.intent}".`
  } else if (topNames.length === 1) {
    text = `Top suggestion for "${input.intent}" is ${topNames[0]}.`
  } else {
    text = `Top suggestions for "${input.intent}" are ${topNames.join(', ')}.`
  }

  if (input.filters?.category.length) {
    text += ` Categories: ${input.filters.category.join(', ')}.`
  }
  if (input.filters?.open_now !== null) {
    text += input.filters.open_now
      ? ' Open-now filter is active.'
      : ' Closed-now filter is active.'
  }

  return {
    text,
    model: 'deterministic-fallback',
    promptVersion: 'discovery-summary-fallback-v1',
    usedFallback: true,
  }
}

async function fetchCoordinates(
  supabase: SupabaseServerClient,
  placeIds: string[]
): Promise<PlaceCoordinateMap> {
  if (!placeIds.length) return new Map()
  const { data, error } = await supabase
    .from('places_view')
    .select('id, lat, lng')
    .in('id', placeIds)
  if (error) {
    throw new Error(error.message || 'Failed to load place coordinates')
  }

  const map: PlaceCoordinateMap = new Map()
  for (const row of (data ?? []) as PlaceCoordinateRow[]) {
    if (!row.id) continue
    map.set(row.id, {
      lat: row.lat ?? null,
      lng: row.lng ?? null,
    })
  }
  return map
}

function asComparableName(value: string | null): string {
  return (value ?? '').toLowerCase()
}

export async function buildDiscoverySuggestions(
  input: SuggestServiceInput
): Promise<SuggestServiceResult> {
  const { supabase, userId, canonical } = input

  const translated = translateIntentToFiltersDeterministic({
    intent: canonical.intent,
    listId: canonical.list_id,
  })
  const parsedFilters = parseServerFilterPayload(translated.rawFilters)
  if (!parsedFilters.ok) {
    throw new Error(`Deterministic filter translation was invalid: ${parsedFilters.message}`)
  }
  const canonicalFilters = parsedFilters.canonical

  const query = canonical.intent
  const normalizedQuery = normalizeLocalSearchQuery(query)
  const categoryMatch = resolveCategoryMatch(query)

  let listTimezone: string | null = null
  const localPlaces: PlaceRecord[] = []
  const localTagsByPlaceId = new Map<string, string[] | null>()

  if (canonical.list_id) {
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, timezone')
      .eq('id', canonical.list_id)
      .single()

    if (listError || !listData) {
      throw new DiscoverySuggestServiceError(
        'not_found',
        listError?.message || 'List not found',
        canonical
      )
    }
    listTimezone = (listData.timezone as string | null) ?? null

    const { data, error } = await supabase
      .from('list_items')
      .select(
        'place_id, tags, place:places(id, name, address, category, energy, opening_hours, google_place_id, name_normalized, address_normalized)'
      )
      .eq('list_id', canonical.list_id)

    if (error) {
      throw new Error(error.message || 'Failed to load list items')
    }

    for (const row of (data ?? []) as ListItemRecord[]) {
      if (!row.place) continue
      localPlaces.push(row.place)
      localTagsByPlaceId.set(row.place_id, row.tags ?? null)
    }
  } else {
    const { data, error } = await supabase
      .from('places')
      .select(
        'id, name, address, category, energy, opening_hours, google_place_id, name_normalized, address_normalized'
      )
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message || 'Failed to load places')
    }

    localPlaces.push(...((data ?? []) as PlaceRecord[]))
  }

  const filteredLocal = localPlaces.filter((place) => {
    if (!applyPlaceFilters(place, canonicalFilters, listTimezone)) {
      return false
    }
    if (canonicalFilters.tags.length > 0) {
      return hasIntersection(localTagsByPlaceId.get(place.id), canonicalFilters.tags)
    }
    return true
  })

  const localCoordinates = await fetchCoordinates(
    supabase,
    filteredLocal.map((place) => place.id)
  )

  const localSorted = filteredLocal
    .map((place) => ({
      place,
      textRank: rankLocalSearchMatch(
        place.name,
        place.address,
        place.category,
        query,
        categoryMatch,
        normalizedQuery,
        place.name_normalized,
        place.address_normalized
      ),
    }))
    .sort((a, b) => {
      if (a.textRank !== b.textRank) return a.textRank - b.textRank
      const nameCmp = asComparableName(a.place.name).localeCompare(
        asComparableName(b.place.name)
      )
      if (nameCmp !== 0) return nameCmp
      return a.place.id.localeCompare(b.place.id)
    })

  const localSuggestions: DiscoverySuggestion[] = localSorted.map(({ place }, index) => {
    const coords = localCoordinates.get(place.id) ?? { lat: null, lng: null }
    const geo = resolveNeighborhood(coords.lat, coords.lng)
    return {
      source: 'places_index',
      source_id: place.id,
      name: place.name ?? null,
      address: place.address ?? null,
      lat: coords.lat,
      lng: coords.lng,
      neighborhood: geo.neighborhood,
      borough: geo.borough,
      matched_place_id: place.id,
      score: 2000 - index,
      rank: 0,
      reasons: ['places_index'],
    }
  })

  let googleCandidates: GooglePlacesTextCandidate[]
  try {
    googleCandidates = await searchGooglePlaces(
      canonical.intent,
      canonical.bias
        ? {
            locationBias: {
              lat: canonical.bias.lat,
              lng: canonical.bias.lng,
              radiusMeters: canonical.bias.radius_m,
            },
          }
        : undefined
    )
  } catch (error: unknown) {
    if (error instanceof SourceFetchError && error.code === 'missing_env') {
      throw new DiscoverySuggestServiceError(
        'provider_unavailable',
        error.message,
        canonical
      )
    }
    if (error instanceof SourceFetchError) {
      throw new DiscoverySuggestServiceError(
        'provider_bad_gateway',
        error.message,
        canonical
      )
    }
    throw error
  }

  const googlePlaceIds = Array.from(
    new Set(
      googleCandidates
        .map((candidate) => candidate.place_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  )

  const { data: matchedPlacesData, error: matchedPlacesError } = googlePlaceIds.length
    ? await supabase
        .from('places')
        .select(
          'id, name, address, category, energy, opening_hours, google_place_id, name_normalized, address_normalized'
        )
        .eq('user_id', userId)
        .in('google_place_id', googlePlaceIds)
    : { data: [], error: null }

  if (matchedPlacesError) {
    throw new Error(matchedPlacesError.message || 'Failed to resolve matched places')
  }

  const matchedByGoogleId = new Map<string, PlaceRecord>()
  for (const row of (matchedPlacesData ?? []) as PlaceRecord[]) {
    if (!row.google_place_id) continue
    matchedByGoogleId.set(row.google_place_id, row)
  }

  const localPlaceIdSet = new Set(localSuggestions.map((suggestion) => suggestion.source_id))
  const restrictiveFilters = isReadConstrainedByPlaceFilters(canonicalFilters)

  const googleRanked = googleCandidates
    .map((candidate) => {
      const matched = matchedByGoogleId.get(candidate.place_id)
      if (matched && localPlaceIdSet.has(matched.id)) {
        return null
      }

      if (canonicalFilters.tags.length > 0) {
        return null
      }

      if (restrictiveFilters) {
        if (!matched) return null
        if (!applyPlaceFilters(matched, canonicalFilters, listTimezone)) {
          return null
        }
      }

      const lat =
        typeof candidate.geometry?.location?.lat === 'number'
          ? candidate.geometry?.location?.lat
          : null
      const lng =
        typeof candidate.geometry?.location?.lng === 'number'
          ? candidate.geometry?.location?.lng
          : null
      const geo = resolveNeighborhood(lat, lng)
      const name = candidate.name ?? null
      const address = candidate.formatted_address ?? null

      const textRank = rankLocalSearchMatch(
        name ?? '',
        address,
        matched?.category ?? '',
        query,
        categoryMatch,
        normalizedQuery,
        matched?.name_normalized ?? null,
        matched?.address_normalized ?? null
      )

      return {
        suggestion: {
          source: 'google_search' as const,
          source_id: candidate.place_id,
          name,
          address,
          lat,
          lng,
          neighborhood: geo.neighborhood,
          borough: geo.borough,
          matched_place_id: matched?.id ?? null,
          score: 0,
          rank: 0,
          reasons: matched ? ['google_search', 'matched_place'] : ['google_search'],
        },
        textRank,
      }
    })
    .filter((item): item is { suggestion: DiscoverySuggestion; textRank: number } =>
      Boolean(item)
    )
    .sort((a, b) => {
      if (a.textRank !== b.textRank) return a.textRank - b.textRank
      const nameCmp = asComparableName(a.suggestion.name).localeCompare(
        asComparableName(b.suggestion.name)
      )
      if (nameCmp !== 0) return nameCmp
      return a.suggestion.source_id.localeCompare(b.suggestion.source_id)
    })
    .map((item, index) => ({
      ...item.suggestion,
      score: 1000 - index,
    }))

  const mergedSorted = [...localSuggestions, ...googleRanked]
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      const nameCmp = asComparableName(a.name).localeCompare(asComparableName(b.name))
      if (nameCmp !== 0) return nameCmp
      return a.source_id.localeCompare(b.source_id)
    })
    .slice(0, canonical.limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }))

  return {
    canonicalFilters,
    suggestions: mergedSorted,
    summary: canonical.include_summary
      ? buildDeterministicSummary({
          intent: canonical.intent,
          filters: canonicalFilters,
          suggestions: mergedSorted,
        })
      : null,
    meta: {
      retrieved_count: localSuggestions.length + googleRanked.length,
      returned_count: mergedSorted.length,
      pipeline_version: DISCOVERY_PIPELINE_VERSION,
    },
  }
}
