/**
 * Construct a tappable Google Maps URL for a place.
 *
 * Priority:
 * 1. google_place_id → https://www.google.com/maps/place/?q=place_id:<id>
 * 2. lat + lng       → https://www.google.com/maps/search/?api=1&query=<lat>,<lng>
 * 3. null            (no usable coordinates)
 */
export function googleMapsUrl(params: {
  google_place_id: string | null | undefined
  lat: number | null | undefined
  lng: number | null | undefined
}): string | null {
  if (params.google_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${params.google_place_id}`
  }
  if (params.lat != null && params.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${params.lat},${params.lng}`
  }
  return null
}
