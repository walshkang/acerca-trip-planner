# Transit Coverage S1 — Manual Override Lookup

## What to build

Add a manual GeoJSON override check at the top of the transit API route. When a city has known Transitland gaps (HK, Paris, Delhi, etc.), a hand-curated file in Supabase Storage `transit-manual/{city_slug}.geojson` wins over Transitland automatically.

No UI changes. No new migrations. Just a new lookup step at the start of the existing GET handler.

## Files to modify

- `app/api/transit/routes/route.ts` — add manual override lookup before the cache check
- `lib/transit/metroArea.ts` — add `GRID_KEY_TO_CITY` map + `citySlugForGrid()` helper

## Files to reference (read these first)

- `app/api/transit/routes/route.ts` — current GET handler; understand `gridKey()`, `cachePath`, the Supabase storage download pattern, and `geoJsonResponse()`
- `lib/transit/metroArea.ts` — `gridKey()` function signature; understand the grid snapping logic (rounds lat/lng to nearest 0.5°)
- `docs/TRANSIT_COVERAGE_PLAN.md` — full spec; Section "Tier 1 — Manual GeoJSON overrides" has the city slug table and file format

## Implementation steps

### 1. Add `GRID_KEY_TO_CITY` and `citySlugForGrid` to metroArea.ts

**File:** `lib/transit/metroArea.ts`

Add after the existing exports:

```typescript
// Grid key → city slug for cities with manual override GeoJSON in Supabase Storage.
// Grid keys use the same 0.5° snapping as gridKey() — snap lat/lng down to nearest 0.5.
// Add new entries here as manual files are uploaded to transit-manual/{slug}.geojson.
export const GRID_KEY_TO_CITY: Record<string, string> = {
  '22.0_114.0': 'hong-kong',
  '48.5_2.0':   'paris',
  '28.5_77.0':  'delhi',
  '22.5_114.0': 'shenzhen',
  '41.0_29.0':  'istanbul',
}

export function citySlugForGrid(key: string): string | null {
  return GRID_KEY_TO_CITY[key] ?? null
}
```

### 2. Add the manual bucket constant

**File:** `app/api/transit/routes/route.ts`

Add near the existing `TRANSIT_CACHE_BUCKET` constant:

```typescript
const TRANSIT_MANUAL_BUCKET = 'transit-manual'
```

### 3. Insert the manual override lookup at the top of the GET handler

**File:** `app/api/transit/routes/route.ts`

Import the new helper:
```typescript
import { DEFAULT_ROUTE_COLOR, gridKey, normalizeMode, citySlugForGrid } from '@/lib/transit/metroArea'
```

After computing `cachePath` (i.e. after `const cachePath = ...`), add:

```typescript
// --- Tier 1: Manual override ---
const citySlug = citySlugForGrid(gridKey(lat, lng))
if (citySlug) {
  try {
    const supabase = getAdminSupabase()
    const { data: manualData, error: manualError } = await supabase.storage
      .from(TRANSIT_MANUAL_BUCKET)
      .download(`${citySlug}.geojson`)

    if (!manualError && manualData) {
      const parsed = (JSON.parse(await manualData.text()) ?? null) as unknown
      if (hasCanonicalModeOnFeatures(parsed)) {
        return geoJsonResponse(parsed as GeoJsonFeatureCollection)
      }
    }
  } catch (err) {
    console.warn('Transit manual override lookup failed:', err)
  }
}
// --- End Tier 1 ---
```

This must come **before** the existing cache check block. If the manual file doesn't exist or fails to parse, fall through silently to the existing Transitland + cache flow.

## What NOT to do

- Don't cache manual override responses — they're already stored in Supabase Storage
- Don't modify the grid key algorithm — city slugs must match the same snapping as `gridKey()`
- Don't fail loudly if the manual bucket is missing a file — fall through to Transitland
- Don't add any UI changes
- Don't modify how Transitland or the v2 cache behaves

## Verification

After implementing, write a test in `tests/transit/metroArea.test.ts`:

```typescript
import { citySlugForGrid, gridKey } from '@/lib/transit/metroArea'

it('resolves HK grid key to hong-kong', () => {
  expect(citySlugForGrid(gridKey(22.3, 114.1))).toBe('hong-kong')
})

it('returns null for unknown grid key', () => {
  expect(citySlugForGrid(gridKey(35.6, 139.7))).toBeNull() // Tokyo — no override
})
```

Run `npm test` to confirm all tests pass.
