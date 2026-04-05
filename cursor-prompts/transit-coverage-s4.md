# Transit Coverage S4 — OSM Overpass Fallback

## What to build

When Transitland returns no useful transit features (0 features with `canonical_mode` in `['subway', 'rail', 'tram', 'light_rail']`), fall back to OSM Overpass. Normalize the result to the same schema as Transitland, cache it to `transit-cache/v2/{gridKey}.geojson`, and return it.

This is the final fallback in the three-tier chain. It will cover Paris, HK (if no manual file), Delhi, Istanbul, and other Transitland gaps.

## Prerequisite

S1 (manual override lookup) must be merged first — this adds Tier 4 after the existing Tier 2/3 chain.

## Files to modify

- `app/api/transit/routes/route.ts` — add OSM fallback after Transitland returns empty/unusable
- `lib/transit/osm.ts` — **new file** — Overpass query + normalization logic

## Files to reference (read these first)

- `app/api/transit/routes/route.ts` — understand the full GET handler flow end to end; you're adding a step after the Transitland fetch
- `lib/transit/metroArea.ts` — `normalizeMode()`, `DEFAULT_ROUTE_COLOR`, `gridKey()` — reuse these
- `docs/TRANSIT_COVERAGE_PLAN.md` — Section "Tier 3 — OSM Overpass fallback" has the query, normalization rules, and caveats

## Implementation steps

### 1. Create `lib/transit/osm.ts`

This file owns the Overpass query and normalization. Keep it pure (no Supabase, no Next.js).

```typescript
import { normalizeMode, DEFAULT_ROUTE_COLOR } from '@/lib/transit/metroArea'
import type { GeoJsonFeatureCollection } from '@/components/map/MapView.types'

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
    case 'metro': return 1
    case 'tram':  return 0
    case 'light_rail': return 0
    case 'rail':
    case 'train': return 2
    default:       return 2
  }
}

function parseColor(raw: string | undefined): string {
  if (!raw) return DEFAULT_ROUTE_COLOR
  return raw.replace(/^#/, '').toUpperCase()
}

/**
 * Fetch transit relations from OSM Overpass for the given bbox and normalize
 * to our GeoJSON feature schema. Returns null if the fetch fails.
 */
export async function fetchOsmTransit(
  lat: number,
  lng: number
): Promise<GeoJsonFeatureCollection | null> {
  const south = lat - BBOX_PAD
  const west  = lng - BBOX_PAD
  const north = lat + BBOX_PAD
  const east  = lng + BBOX_PAD

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

    // Only include transit modes we care about
    if (!['subway', 'rail', 'tram', 'light_rail'].includes(canonical)) return []

    // Collect coordinates from way members that have geometry
    const coordinates: number[][][] = []
    for (const member of rel.members ?? []) {
      if (member.type !== 'way' || !member.geometry?.length) continue
      const line = member.geometry.map((pt) => [pt.lon, pt.lat])
      if (line.length >= 2) coordinates.push(line)
    }
    if (coordinates.length === 0) return []

    return [{
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
    }]
  })

  if (features.length === 0) return null

  return { type: 'FeatureCollection', features }
}
```

### 2. Wire the fallback into the GET handler

**File:** `app/api/transit/routes/route.ts`

Import the new function:
```typescript
import { fetchOsmTransit } from '@/lib/transit/osm'
```

The current flow ends after the Transitland block with `return geoJsonResponse(featureCollection)`. Before that final return, check if the Transitland result has any useful subway/rail features. If not (or if Transitland itself returned nothing), call `fetchOsmTransit`.

Find the section that handles an empty Transitland response:
```typescript
if (!payload.features?.length) {
  return new NextResponse(null, { status: 204 })
}
```

Replace it with:
```typescript
if (!payload.features?.length) {
  // Tier 3: OSM fallback
  const osmResult = await fetchOsmTransit(lat, lng)
  if (osmResult) {
    // Cache so next request is instant
    try {
      const supabase = getAdminSupabase()
      await supabase.storage
        .from(TRANSIT_CACHE_BUCKET)
        .upload(cachePath, JSON.stringify(osmResult), {
          upsert: true,
          contentType: 'application/geo+json',
        })
    } catch (err) {
      console.warn('Transit OSM cache upload failed:', err)
    }
    return geoJsonResponse(osmResult)
  }
  return new NextResponse(null, { status: 204 })
}
```

Also add a second OSM fallback for the case where Transitland returns features but **none have useful canonical modes** (subway/rail/tram). After the `featureCollection` is built, check:

```typescript
const hasUsefulModes = featureCollection.features.some(
  (f) =>
    f.properties.canonical_mode === 'subway' ||
    f.properties.canonical_mode === 'rail' ||
    f.properties.canonical_mode === 'tram' ||
    f.properties.canonical_mode === 'light_rail'
)

if (!hasUsefulModes) {
  // Transitland has data but nothing transit-useful — try OSM
  const osmResult = await fetchOsmTransit(lat, lng)
  if (osmResult) {
    try {
      const supabase = getAdminSupabase()
      await supabase.storage
        .from(TRANSIT_CACHE_BUCKET)
        .upload(cachePath, JSON.stringify(osmResult), {
          upsert: true,
          contentType: 'application/geo+json',
        })
    } catch (err) {
      console.warn('Transit OSM (useful-mode miss) cache upload failed:', err)
    }
    return geoJsonResponse(osmResult)
  }
}
```

This goes before the final `return geoJsonResponse(featureCollection)`.

## What NOT to do

- Don't add bus routes — the query intentionally excludes `bus`
- Don't skip caching the OSM result — caching is what keeps the app fast on repeat visits
- Don't use a timer-based timeout (use `AbortSignal.timeout`)
- Don't fail loudly if Overpass is unreachable — log and fall through to 204
- Don't modify the manual override (S1) or Transitland cache behavior

## Verification

Add tests in `tests/transit/osm.test.ts`:

```typescript
import { fetchOsmTransit } from '@/lib/transit/osm'
import { vi, it, expect, beforeEach } from 'vitest'

// Mock fetch
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

it('returns null when overpass returns empty elements', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).toBeNull()
})

it('normalizes a subway relation to canonical schema', async () => {
  const mockRelation = {
    type: 'relation',
    id: 1,
    tags: { route: 'subway', name: 'Tsuen Wan Line', colour: '#CC0000' },
    members: [
      {
        type: 'way',
        ref: 100,
        role: '',
        geometry: [{ lat: 22.3, lon: 114.1 }, { lat: 22.31, lon: 114.11 }],
      },
    ],
  }
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [mockRelation] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).not.toBeNull()
  expect(result!.features[0].properties.canonical_mode).toBe('subway')
  expect(result!.features[0].properties.route_color).toBe('CC0000')
  expect(result!.features[0].geometry.type).toBe('MultiLineString')
})

it('excludes relations with no way geometry', async () => {
  const mockRelation = {
    type: 'relation',
    id: 2,
    tags: { route: 'subway', name: 'No Geometry Line' },
    members: [{ type: 'node', ref: 200, role: 'stop' }],
  }
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [mockRelation] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).toBeNull()
})
```

Run `npm test` to confirm all tests pass.
