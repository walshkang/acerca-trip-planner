import type { GeoJsonFeatureCollection } from '@/components/map/MapView.types'
import { DEFAULT_ROUTE_COLOR, normalizeMode } from '@/lib/transit/metroArea'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_TIMEOUT_MS = 25_000

// Bounding box padding in degrees
const BBOX_PAD = 0.3

type OsmRelation = {
  type: 'relation'
  id: number
  tags?: Record<string, string>
  members?: Array<{
    type: string
    ref: number
    role: string
    geometry?: Array<{ lat: number; lon: number }>
  }>
}

type OverpassResponse = {
  elements?: OsmRelation[]
}

function routeTagToRouteType(route: string): number {
  switch (route) {
    case 'subway':
    case 'metro':
      return 1
    case 'tram':
      return 0
    case 'light_rail':
      return 0
    case 'rail':
    case 'train':
      return 2
    default:
      return 2
  }
}

function parseColor(raw: string | undefined): string {
  if (!raw) return DEFAULT_ROUTE_COLOR
  return raw.replace(/^#/, '').toUpperCase()
}

const USEFUL_CANONICAL_MODES = new Set(['subway', 'rail', 'tram', 'light_rail'])

/**
 * Fetch transit relations from OSM Overpass for the given bbox and normalize
 * to our GeoJSON feature schema. Returns null if the fetch fails.
 */
export async function fetchOsmTransit(
  lat: number,
  lng: number
): Promise<GeoJsonFeatureCollection | null> {
  const south = lat - BBOX_PAD
  const west = lng - BBOX_PAD
  const north = lat + BBOX_PAD
  const east = lng + BBOX_PAD

  const query = `[out:json][timeout:25];
rel["route"~"subway|metro|light_rail|tram|rail"](${south},${west},${north},${east});
out geom;`

  let json: OverpassResponse
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    })
    if (!res.ok) return null
    json = (await res.json()) as OverpassResponse
  } catch {
    return null
  }

  if (!json.elements?.length) return null

  const features = json.elements.flatMap((rel) => {
    const tags = rel.tags ?? {}
    const routeTag = tags['route'] ?? ''
    if (!routeTag) return []

    const routeType = routeTagToRouteType(routeTag)
    const canonical = normalizeMode(routeType)

    if (!USEFUL_CANONICAL_MODES.has(canonical)) return []

    // Collect coordinates from way members that have geometry
    const coordinates: number[][][] = []
    for (const member of rel.members ?? []) {
      if (member.type !== 'way' || !member.geometry?.length) continue
      const line = member.geometry.map((pt) => [pt.lon, pt.lat])
      if (line.length >= 2) coordinates.push(line)
    }
    if (coordinates.length === 0) return []

    return [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'MultiLineString' as const,
          coordinates,
        },
        properties: {
          route_short_name: tags['name'] ?? tags['ref'] ?? '',
          route_color: parseColor(tags['colour'] ?? tags['color']),
          route_type: routeType,
          canonical_mode: canonical,
        },
      },
    ]
  })

  if (features.length === 0) return null

  return { type: 'FeatureCollection', features }
}
