# Per-Line Transit Layer — Shape Up

> Continues from `MAP_LAYER_SLICES.md` (Slices 1–3 shipped: layer toggle, tile-based transit, persistence).
> This shape adds per-line subway/rail/bus rendering with official route colors, auto-discovered from GTFS via Transitland.

---

## Frame

**Problem:** The current transit layer treats all subway as one purple mass and all rail as one gray mass. Users can't distinguish the A train from the 7 train, and bus routes aren't shown at all. For a trip planner, knowing *which* line is where is the difference between "there's transit nearby" and "I can take the L to get there."

**Outcome:** When a user looks at the map in any supported city, subway lines render with their official colors (MTA blue for A/C/E, red for 1/2/3, etc.). Bus and commuter rail are toggleable as separate sub-layers. Transit data is discovered automatically when a user adds places in a new city — no manual setup. Cities without transit data degrade gracefully to the existing base-tile transit layer.

**Appetite:** Medium — the GTFS proxy is the proving ground; if Transitland returns good route geometries, the rest is UI plumbing.

---

## How it works today

```
User toggles "Transit" ON
  → MapShell passes showTransit=true to MapView
  → MapView adds two layers from base map vector tiles:
      transit-lines (type: line, filtered by class: rail/subway/tram)
      transit-stops (type: circle, filtered by mode)
  → Color expression: match on subway→purple, rail→gray, tram→teal
  → Same in both MapView.mapbox.tsx and MapView.maplibre.tsx
```

**Limitations:**
- Base tiles classify by **mode** (subway, rail, tram) but not by **route** (A train, Circle line)
- No bus data in base tiles (deliberately excluded — too many routes)
- No official route colors — just our hardcoded mode→color map
- Per-city GeoJSON exists for NYC (`public/map/overlays/nyc_subway_lines.geojson`, 5800 features with MTA internal route IDs) but isn't used and has no color data

---

## Data source: Transitland

**Why Transitland:** Open-source transit data aggregator (2,500+ GTFS feeds worldwide). REST API maps coordinates → feeds → routes with geometries and colors. No GTFS file parsing needed on our side.

| Endpoint | What it returns |
|----------|----------------|
| `GET /api/v2/rest/feeds?lon=X&lat=Y` | GTFS feeds near a point |
| `GET /api/v2/rest/routes?lon=X&lat=Y&radius=25000` | Routes with `route_color`, `route_type`, geometry |

**`route_type` values (GTFS standard):**
- 0 = Tram/light rail
- 1 = Subway/metro
- 2 = Commuter rail
- 3 = Bus
- 4 = Ferry
- 5+ = Cable car, gondola, funicular

**Key properties per route:** `route_short_name` ("A", "7", "L"), `route_color` ("#0039A6"), `route_type`, `geometry` (LineString/MultiLineString).

---

## Architecture target

```
User adds place in Berlin (new city)
  → detect metro area from place coords (grid snap or bbox cluster)
  → check Supabase Storage: cached GeoJSON for this metro?
     ├─ YES → client loads as dynamic map source
     └─ NO  → API route calls Transitland
              → fetches routes by lat/lng + radius
              → groups by mode (subway / bus / rail)
              → builds GeoJSON FeatureCollection per mode
              → stores in Supabase Storage (keyed by metro area)
              → returns URL → client loads as map source
              → no feeds found? → do nothing, base tile layer still works

MapView rendering:
  base tile transit layer (existing, always available)
  + GTFS subway source (per-line colors, when available)
  + GTFS bus source (when available + toggled on)
  + GTFS rail source (when available + toggled on)
```

---

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | Subway lines render with official route colors from GTFS `route_color` |
| R2 | Individual routes distinguishable (A train vs 7 train, not just "subway") |
| R3 | Bus routes available as a toggleable sub-layer (only when GTFS data exists) |
| R4 | Commuter rail available as a toggleable sub-layer |
| R5 | Transit data auto-discovered when user adds places in a new city |
| R6 | Cached per metro area — not re-fetched on every map load |
| R7 | Cities without GTFS data degrade to existing base-tile transit (no error, no empty state) |
| R8 | Sub-toggles only show modes that exist for the current viewport's data |

---

## Shape: GTFS auto-discovery + per-line rendering

### S1 — Metro area detection

When a place is added, snap its coordinates to a metro area key (e.g., round lat/lng to ~0.3° grid, or use a simple bbox lookup). This determines the cache key for transit data. Two places in Brooklyn and Manhattan → same "NYC metro" bucket.

### S2 — GTFS proxy endpoint

Supabase Edge Function or Next.js API route:
- Input: `lat`, `lng`
- Resolves metro area key
- Checks Supabase Storage for cached `{metro_key}/subway.geojson`, `bus.geojson`, `rail.geojson`
- On cache miss: calls Transitland `/api/v2/rest/routes` with appropriate radius
- Groups routes by `route_type` into mode-specific GeoJSON files
- Each feature carries: `route_short_name`, `route_color`, `route_type`, geometry
- Stores in Supabase Storage, returns URLs
- Returns 204 if no feeds/routes found

### S3 — Dynamic map source loading

MapView gains the ability to load GeoJSON sources dynamically from URLs:
- On transit toggle, check if GTFS data exists for the viewport's metro area
- Add as separate map sources (`gtfs-subway`, `gtfs-bus`, `gtfs-rail`)
- Render lines with `['get', 'route_color']` as the line-color expression (data-driven styling)
- GTFS layers render **on top of** base tile transit layer (which becomes the fallback)

### S4 — Auto-trigger on place add

When `MapShell.fetchPlaces()` returns places, derive which metro areas are represented. For any metro area without cached transit data, fire the GTFS proxy in the background. No loading state — data appears when ready.

### S5 — Mode sub-toggles

The current single "Transit" toggle becomes:
```
Transit (master toggle)
  ├─ Subway     ← visible if metro has route_type 0 or 1
  ├─ Bus        ← visible if metro has route_type 3
  └─ Rail       ← visible if metro has route_type 2
```
Master toggle off → all sub-toggles hidden. Sub-toggles only appear for modes with data. Persisted to `user_preferences` alongside `map_layer`.

---

## Fit check (R × S)

| Requirement | Addressed by |
|-------------|-------------|
| R1 route colors | S3 — data-driven `route_color` styling |
| R2 per-line distinction | S2 — each route is a separate GeoJSON feature with `route_short_name` |
| R3 bus sub-layer | S2 (separate GeoJSON per mode) + S5 (toggle) |
| R4 rail sub-layer | S2 + S5 |
| R5 auto-discovery | S4 — triggered on place fetch |
| R6 caching | S2 — Supabase Storage keyed by metro area |
| R7 graceful degradation | S2 returns 204 → S3 keeps base tile layer → S5 hides missing mode toggles |
| R8 viewport-aware toggles | S5 — reads cached metro metadata to show/hide modes |

---

## Slices (vertical, demo-able)

### Slice 1 — GTFS proxy endpoint (proving ground)

**Goal:** Call Transitland, get per-line route data, cache it. Validate data quality for target cities.

**Creates:** `app/api/transit/routes/route.ts` (or Supabase Edge Function)
**Creates:** `lib/transit/metroArea.ts` (coordinate → metro key mapping)

**Acceptance:**
- [ ] `GET /api/transit/routes?lat=40.75&lng=-73.99` returns GeoJSON with NYC subway routes, each with `route_short_name` and `route_color`
- [ ] Second call returns cached result from Supabase Storage
- [ ] `GET /api/transit/routes?lat=13.75&lng=100.52` returns Bangkok BTS/MRT data (or 204 if not in Transitland)
- [ ] Unknown location returns 204, no error

### Slice 2 — Per-line subway rendering (one city)

**Goal:** Subway lines on the map with official colors. NYC as proof of concept.

**Modifies:** `components/map/MapView.mapbox.tsx`, `components/map/MapView.maplibre.tsx`, `components/map/MapShell.tsx`

**Acceptance:**
- [ ] With transit toggled on and GTFS data cached for viewport, subway lines render with per-route colors
- [ ] A/C/E lines are blue, 1/2/3 are red, etc. (official MTA colors)
- [ ] Base tile transit layer still renders underneath (visible for routes not in GTFS data)
- [ ] No visual regression when GTFS data is not available

### Slice 3 — Auto-trigger on place add

**Goal:** Adding a place in a new city silently populates transit data.

**Modifies:** `components/map/MapShell.tsx` (place fetch → metro area check → background API call)

**Acceptance:**
- [ ] Add a place in Singapore → within seconds, transit data appears on map (if toggled on)
- [ ] No loading spinner or blocking UI
- [ ] Adding another place in the same city doesn't re-fetch

### Slice 4 — Mode sub-toggles

**Goal:** User can toggle subway/bus/rail independently.

**Modifies:** `components/paper/PaperHeader.tsx`, `lib/state/useMapLayerStore.ts`, `app/api/user/preferences/route.ts`

**Acceptance:**
- [ ] Transit toggle expands to show sub-toggles for available modes
- [ ] Toggling "Bus" off hides bus routes but keeps subway/rail
- [ ] Sub-toggle state persists across sessions
- [ ] Modes not available in current viewport don't appear as toggles

### Slice 5 — Multi-city validation

**Goal:** Confirm data quality and rendering for target cities.

**Cities:** NYC, Bangkok, Singapore, Hong Kong (matching existing PMTiles coverage)

**Acceptance:**
- [ ] Each city shows recognizable transit lines with correct colors
- [ ] Bus routes render without overwhelming the map (may need zoom-level filtering)
- [ ] Cities with partial GTFS coverage (missing shapes) degrade gracefully
- [ ] Performance acceptable with multiple GeoJSON sources loaded

---

## Open questions

1. **Transitland API key / rate limits:** Free tier may suffice for caching pattern (one call per metro area, ever). Confirm limits before Slice 1.
2. **Bus density:** Some cities have 200+ bus routes. May need zoom-level gating (only show bus at zoom ≥ 13) or filtering to major routes. Decide after Slice 5 testing.
3. **Metro area key strategy:** Simple grid snap vs proper metro boundary lookup. Grid snap is simpler; metro boundaries are more accurate for edge cases (place in New Jersey should get NYC metro transit). Start with grid, upgrade if needed.
4. **Transitland data freshness:** GTFS feeds update periodically (route changes, new lines). Cache TTL? Monthly refresh? Manual purge? Not urgent — transit networks change slowly.
5. **Hover/tap interaction:** Should tapping a subway line show route name/info? Out of scope for this shape but a natural follow-on.

---

## Resolved decisions

1. **Data source:** Transitland API for route discovery + geometries. Not raw GTFS file processing. Not OSM Overpass.
2. **No map legend:** Consistent with the UI observations shape — per-line colors are self-evident for transit (users recognize their city's subway colors). No legend overlay.
3. **Additive, not replacement:** GTFS data layers render on top of existing base-tile transit. Base tiles are the fallback, not replaced.
4. **Per-metro caching:** Transit data cached by metro area in Supabase Storage. Not per-user, not per-session.
5. **Existing NYC GeoJSON (`public/map/overlays/`):** Superseded by this approach. Can be removed after Slice 2 ships.
