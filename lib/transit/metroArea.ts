const GRID_DEGREES = 0.5

function snapToGrid(coord: number): number {
  return Math.floor(coord / GRID_DEGREES) * GRID_DEGREES
}

// Floor-based 0.5° grid snap → storage-safe key like "40.5_-74.0"
export function gridKey(lat: number, lng: number): string {
  return `${snapToGrid(lat).toFixed(1)}_${snapToGrid(lng).toFixed(1)}`
}

export const ROUTE_TYPES = { TRAM: 0, SUBWAY: 1, RAIL: 2, BUS: 3 } as const

export const DEFAULT_ROUTE_COLOR = '888888'

/** GTFS route types normalized for filtering; bump transit cache version if this mapping changes. */
export type CanonicalMode = 'subway' | 'rail' | 'bus' | 'ferry' | 'tram' | 'other'

/**
 * Maps GTFS `route_type` (standard + common extended ranges) to a canonical mode.
 * Single place for feed quirks — adjust here rather than in map filters.
 */
export function normalizeMode(routeType: number): CanonicalMode {
  if (!Number.isFinite(routeType)) return 'other'
  const t = Math.trunc(routeType)

  // Standard GTFS (google/transit/gtfs/reference)
  switch (t) {
    case 0:
      return 'tram'
    case 1:
      return 'subway'
    case 2:
      return 'rail'
    case 3:
      return 'bus'
    case 4:
      return 'ferry'
    case 5:
      return 'tram' // Cable tram
    case 6:
      return 'other' // Gondola / aerial tramway
    case 7:
      return 'tram' // Funicular
    case 8:
      return 'bus' // Trolleybus
    case 11:
      return 'bus' // Trolleybus (alt)
    case 12:
      return 'tram' // Monorail
    default:
      break
  }

  // Extended GTFS route types (common EU / Google ranges)
  if (t >= 100 && t <= 199) return 'rail'
  if (t >= 400 && t <= 499) return 'subway'
  if (t >= 700 && t <= 799) return 'bus'
  if (t >= 900 && t <= 999) return 'tram'
  if (t >= 1000 && t <= 1099) return 'ferry'
  if (t >= 1200 && t <= 1299) return 'bus'
  if (t >= 1300 && t <= 1399) return 'other'
  if (t >= 1400 && t <= 1499) return 'tram'

  return 'other'
}
