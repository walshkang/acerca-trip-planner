import type { LatLng, MapPlace } from '@/components/map/MapView.types'

export type Bounds = { sw: LatLng; ne: LatLng }

const EARTH_RADIUS_METERS = 6371000

export function haversineMeters(a: LatLng, b: LatLng) {
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(value)))
}

export function boundsFromPlaces(places: MapPlace[]): Bounds | null {
  if (!places.length) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const place of places) {
    minLng = Math.min(minLng, place.lng)
    maxLng = Math.max(maxLng, place.lng)
    minLat = Math.min(minLat, place.lat)
    maxLat = Math.max(maxLat, place.lat)
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null
  return {
    sw: { lng: minLng, lat: minLat },
    ne: { lng: maxLng, lat: maxLat },
  }
}

export function boundsToArray(bounds: Bounds): [[number, number], [number, number]] {
  return [
    [bounds.sw.lng, bounds.sw.lat],
    [bounds.ne.lng, bounds.ne.lat],
  ]
}

export function boundsSpan(bounds: Bounds) {
  return {
    lngSpan: Math.abs(bounds.ne.lng - bounds.sw.lng),
    latSpan: Math.abs(bounds.ne.lat - bounds.sw.lat),
  }
}
