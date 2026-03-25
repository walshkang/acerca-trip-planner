/**
 * Parse a Google Maps URL for an embedded ChIJ place_id (query params).
 */
export function parsePlaceIdFromGoogleMapsUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const placeId =
      u.searchParams.get('place_id') ??
      u.searchParams.get('query_place_id') ??
      u.searchParams.get('q')
    if (placeId && placeId.startsWith('ChI')) return placeId
    return null
  } catch {
    return null
  }
}

/** Heuristic: direct Google place_id string (ChIJ…). */
export function looksLikeGooglePlaceId(raw: string): boolean {
  const s = raw.trim()
  return s.startsWith('ChI') && s.length >= 20 && s.length <= 200
}
