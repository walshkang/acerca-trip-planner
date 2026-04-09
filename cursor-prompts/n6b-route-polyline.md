# N6b — Route polyline on MapInset (OSRM)

## Goal

When a day is selected in PlannerShellPaper, draw a **route polyline** on the MapInset connecting that day's places in scheduled order. Uses the existing OSRM adapter, extended to return geometry. The route updates as the user moves between days.

**Prerequisite:** N6a must be shipped first (it establishes `dayDirectionsUrl` and the ordered-stops memo).

**Model: Opus** — touches the routing adapter contract, API route, MapInset, and MapView Mapbox layer system.

---

## Context

### What already exists

| File | What it does |
|------|-------------|
| `lib/routing/adapters/osrm.ts` | Calls OSRM `/route/v1/driving/…?overview=false` — returns leg durations only, **no geometry** |
| `app/api/lists/[id]/routing/preview/route.ts` | Server route: fetches list items → calls adapter → returns computed legs |
| `lib/routing/contract.ts` | Type definitions for routing requests/responses |
| `components/map/MapInset.tsx` | Renders day-colored pins via Mapbox `MapView.mapbox` |
| `components/app/PlannerShellPaper.tsx` | Orchestrates planner; has `plannerSelectedDay`, `activeListItems`, `mapPlaces` |

### What needs to change

OSRM must return a GeoJSON LineString geometry when requested. The API route passes it through. MapInset renders it as a line layer.

---

## Step 1 — Extend the OSRM adapter to return geometry

### `lib/routing/adapters/osrm.ts`

Change `?overview=false` to `?overview=full&geometries=geojson` and parse the returned geometry:

```ts
type OsrmRoute = {
  legs: OsrmLeg[]
  geometry?: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}
```

In `fetchOsrmRoute`:

```ts
const url = `${baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
```

Extend `RoutingProviderResult` (in `lib/routing/provider.ts` or `lib/routing/contract.ts`) to carry the geometry:

```ts
type RoutingProviderResult =
  | { ok: true; provider: RoutingProviderKind; legs: RoutingProviderLeg[]; routeGeometry?: GeoJsonLineString }
  | { ok: false; code: string; provider: RoutingProviderKind; message?: string }
```

Where `GeoJsonLineString` is:
```ts
type GeoJsonLineString = { type: 'LineString'; coordinates: [number, number][] }
```

Pass it through in `createOsrmAdapter`:

```ts
return {
  ok: true,
  provider: 'osrm',
  legs: parsedLegs,
  routeGeometry: route.geometry ?? undefined,
}
```

### `app/api/lists/[id]/routing/preview/route.ts`

Include `routeGeometry` in the response body alongside the existing `legs`/`computed_legs` payload. The client will consume it.

---

## Step 2 — Client-side fetch in PlannerShellPaper

### `components/app/PlannerShellPaper.tsx`

Add state:

```ts
const [dayRouteGeometry, setDayRouteGeometry] = useState<GeoJsonLineString | null>(null)
```

Add an effect that fires when `plannerSelectedDay` or `activeListItems` or `mapPlaces` change:

```ts
useEffect(() => {
  setDayRouteGeometry(null)
  if (!plannerSelectedDay || !activeListId) return
  const dayItems = activeListItems
    .filter((item) => item.scheduled_date === plannerSelectedDay)
    .sort((a, b) => {
      if (a.scheduled_start_time == null) return 1
      if (b.scheduled_start_time == null) return -1
      return a.scheduled_start_time.localeCompare(b.scheduled_start_time)
    })
  const stops = dayItems
    .map((item) => mapPlaces.find((p) => p.id === item.place_id))
    .filter((p): p is MapPlace => p != null && p.lat != null && p.lng != null)
  if (stops.length < 2) return   // OSRM needs ≥2 stops
  const controller = new AbortController()
  fetch(`/api/lists/${activeListId}/routing/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      waypoints: stops.map((p) => ({ lat: p.lat, lng: p.lng })),
    }),
    signal: controller.signal,
  })
    .then((r) => r.ok ? r.json() : Promise.reject(r.status))
    .then((body: { routeGeometry?: GeoJsonLineString }) => {
      if (body.routeGeometry) setDayRouteGeometry(body.routeGeometry)
    })
    .catch(() => {})   // Fail silently — directions button still works without polyline
  return () => controller.abort()
}, [plannerSelectedDay, activeListId, activeListItems, mapPlaces])
```

Pass to MapInset:

```tsx
<MapInset
  className="h-full w-full"
  places={mapPlaces}
  activeListItems={activeListItems}
  selectedDay={plannerSelectedDay}
  onPinClick={onPinClick}
  routeGeometry={dayRouteGeometry}   // ADD
/>
```

---

## Step 3 — Render the polyline in MapInset

### `components/map/MapInset.tsx`

Add `routeGeometry?: GeoJsonLineString | null` to `MapInsetProps`. Pass it through to the map view.

### `components/map/MapView.mapbox.tsx`

This is the renderer used by MapInset (confirmed by `MapInset.tsx` line 6 import).

Add a `routeGeometry?: GeoJsonLineString | null` prop to `MapViewMapboxProps`.

In the component, use a `useEffect` to add/update the route source and layer when `routeGeometry` changes:

```ts
useEffect(() => {
  const map = mapRef.current
  if (!map) return
  const SOURCE_ID = 'day-route'
  const LAYER_ID = 'day-route-line'

  function removeRoute() {
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  }

  if (!routeGeometry) {
    removeRoute()
    return
  }

  removeRoute()
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'Feature', geometry: routeGeometry, properties: {} },
  })
  map.addLayer({
    id: LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#3b82f6',   // Tailwind blue-500 — matches day selection ring
      'line-width': 2.5,
      'line-opacity': 0.7,
      'line-dasharray': [2, 2],  // Dashed — reads as "suggested route", not a road
    },
  })
}, [routeGeometry])
```

Guard: run the effect after the map's `'load'` event fires. Check if the map is already loaded using `mapRef.current?.loaded()` in the effect.

---

## Verification

1. Planner mode, list with ≥2 places on the same day
2. Click that day → polyline appears on MapInset connecting the day's pins in time order
3. Click a different day → old polyline clears, new polyline draws for the new day
4. `OSRM_BASE_URL` not configured → fetch returns 501, `dayRouteGeometry` stays null, MapInset renders without polyline (no crash)
5. Day with 0 or 1 place → no polyline, no fetch
6. `npm run check` passes
7. Existing routing preview badges (travel-time on planner items) still work — OSRM adapter change is additive

---

## Files to touch

- `lib/routing/adapters/osrm.ts` — request `overview=full&geometries=geojson`, parse geometry
- `lib/routing/contract.ts` or `lib/routing/provider.ts` — extend `RoutingProviderResult` with optional `routeGeometry`
- `app/api/lists/[id]/routing/preview/route.ts` — pass `routeGeometry` through in response
- `components/app/PlannerShellPaper.tsx` — fetch route geometry per day, pass to MapInset
- `components/map/MapInset.tsx` — add `routeGeometry` prop, thread to MapView
- `components/map/MapView.mapbox.tsx` — add source/layer for route polyline

## Do NOT touch

- `MapView.maplibre.tsx` — MapInset uses Mapbox only
- `MapShell.tsx` — full-map explore mode, not affected
- `CalendarPlanner.tsx` / `CalendarDayDetail.tsx` — no changes
- OSRM leg duration/distance logic — keep existing behavior, geometry is additive
