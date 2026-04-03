# Transit Coverage — Manual Overrides + OSM Fallback

## Problem

Transitland GTFS coverage is inconsistent across key travel cities. 6 of 12 top cities have no subway/metro data:

| City | Transitland | Notes |
|------|-------------|-------|
| Bangkok | ✓ | BTS + MRT present |
| Dubai | ✓ | Metro present |
| Kuala Lumpur | ✓ | MRT/LRT present |
| London | ✓ (partial) | Tube present, only 5 lines |
| Paris | ✗ | Metro absent; only RER/bus |
| Hong Kong | ✗ | MTR entirely absent |
| Delhi | ✗ | Metro absent |
| Shenzhen | ✗ | Metro absent |
| Istanbul | ✗ | Almost no data |
| Macau | ✗ | No data |
| Mecca | ✗ | No data |
| Antalya | ✗ | No data |

## Approach: Three-tier fallback chain

```
1. Manual override  →  official colors + geometries (hand-curated per city)
2. Transitland      →  official colors + geometries (auto, where available)
3. OSM Overpass     →  geometries only, default color per mode (global fallback)
```

Manual overrides win when present. Transitland is the default. OSM fills the gap.

---

## Tier 1 — Manual GeoJSON overrides

**Where:** Supabase Storage bucket `transit-manual`, path `{city_slug}.geojson`

**Format:** Same schema as Transitland cache:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": { "type": "MultiLineString", "coordinates": [...] },
    "properties": {
      "route_short_name": "MTR Tsuen Wan Line",
      "route_color": "CC0000",
      "route_type": 1,
      "canonical_mode": "subway"
    }
  }]
}
```

**City slug mapping:** Hardcoded table in `lib/transit/metroArea.ts` — map grid key → city slug for known cities. Unknown grid keys have no manual override (fall through to Transitland).

```ts
// e.g. gridKey(22.3, 114.1) → "22.0_114.0" → "hong-kong"
const GRID_KEY_TO_CITY: Record<string, string> = {
  "22.0_114.0": "hong-kong",
  "48.5_2.0":   "paris",
  "28.5_77.0":  "delhi",
  "22.5_114.0": "shenzhen",
  "41.0_29.0":  "istanbul",
  // add as sourced
}
```

**Cities to source (priority order):**
1. **Hong Kong** — MTR open data: `mtr.com.hk` publishes route shapes + official colors
2. **Paris** — RATP/IDFM open data: `data.iledefrance-mobilites.fr`
3. **Delhi** — DMRC: `delhimetrorail.com` (may need manual extraction)
4. **Shenzhen** — Shenzhen Metro: `szmc.net`
5. **Istanbul** — IETT/Metro Istanbul open data

**Ingest flow (manual):**
1. Download authority GeoJSON or GTFS shapes
2. Normalize to our schema (add `canonical_mode`, `route_color`, `route_short_name`)
3. Upload to `transit-manual/{city_slug}.geojson` in Supabase Storage
4. No code change needed — API route checks for manual override automatically

---

## Tier 3 — OSM Overpass fallback

**Trigger:** Transitland returns 0 features with `canonical_mode` in `['subway', 'rail', 'tram']`

**Query:**
```
[out:json][timeout:25];
rel["route"~"subway|metro|light_rail|tram"](south,west,north,east);
out geom;
```

Bbox derived from lat/lng + ~0.3° padding.

**Normalization:**
- `route` tag → `canonical_mode` (`subway`/`tram`/`rail`)
- `colour` or `color` tag → `route_color` (strip `#`); fall back to mode defaults:
  - subway: `555555`, tram: `888888`, rail: `AAAAAA`
- `name` tag → `route_short_name`
- Geometry from relation members (ways)

**OSM confirmed available for:** HK (131 relations), Paris (66 relations). Delhi/Shenzhen/Istanbul expected good based on OSM community activity.

**Caveats:**
- No official colors for most cities (OSM `colour` tag is sparse)
- Relation geometry assembly is complex — ways need to be stitched in order
- Rate limits on public Overpass instance — consider self-hosting or overpass.kumi.systems mirror

---

## API route changes (`app/api/transit/routes/route.ts`)

New lookup order:
```
1. Check transit-manual/{city_slug}.geojson in Supabase Storage
   → hit: return immediately (no caching needed, already stored)
2. Check transit-cache/v2/{gridKey}.geojson (existing Transitland cache)
   → hit with canonical_mode: return
3. Fetch Transitland
   → has subway/rail: normalize, cache, return
   → no subway/rail: proceed to step 4
4. Fetch OSM Overpass
   → normalize, cache to transit-cache/v2/{gridKey}.geojson, return
   → empty: return 204
```

---

## Open questions

1. **Overpass geometry assembly** — OSM relation members are unordered ways. Stitching into a clean LineString/MultiLineString requires sorting. Library options: `osmtogeojson` (JS), or pre-process offline and upload as manual override.
2. **Manual file maintenance** — transit networks change. Manual files need periodic refresh. Monthly cron job or manual trigger?
3. **City slug coverage** — grid snap may put edge cases in wrong bucket (e.g. New Territories vs central HK). Acceptable for now.
4. **Overpass hosting** — public instance has rate limits. For production, consider a dedicated mirror or caching proxy.

---

## Sequencing

| Step | What | Who |
|------|------|-----|
| S1 | Add manual override lookup to API route | Cursor |
| S2 | Source + upload HK MTR GeoJSON | Manual |
| S3 | Source + upload Paris RATP GeoJSON | Manual |
| S4 | Build OSM Overpass fallback in API route | Cursor |
| S5 | Validate remaining cities | Manual |
