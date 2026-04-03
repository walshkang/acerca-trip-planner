# Active Work Context

## Recently shipped: UI Observations Polish

Seven visual/UX fixes — all landed 2026-04-02.

**What shipped:**
- Slot tokens: afternoon is now soft pink (`bg-rose-400`), centralized in `lib/slots.ts`
- Onboarding anchor: filter tip targets correct DOM region
- Trip date defaults: start/end seed to user-local today when empty
- Backlog scroll: max-height + overflow in CalendarPlanner
- Week grid: today cell height matches siblings (unified border/min-h box model)
- Map pins: slot-aware rings (morning=amber, afternoon=rose, evening=indigo), completed=black/dark gray
- Day detail: opaque per-slot outlines at rest, full slot colors while dragging

**New shared modules:**
- `lib/slots.ts` — single source of truth for slot colors (dots, map rings, day-detail borders)
- `components/map/placeMarkerRing.ts` — slot-aware map marker ring resolution
- `lib/dates/local-calendar.ts` — user-local date utilities

---

## Recently shipped: Per-Line Transit Layer (Slices 1, 2, 4)

Full shape: [`docs/TRANSIT_LINES_SHAPE.md`](./TRANSIT_LINES_SHAPE.md)

**What shipped:**
- Slice 1: GTFS proxy endpoint (`/api/transit/routes`) — Transitland fetch, per-metro Supabase Storage cache, `format=geojson` param, `lib/transit/metroArea.ts` grid key
- Slice 2: Per-line subway rendering — `useGtfsLayer` hook, GeoJSON source + `gtfs-transit-lines` layer, data-driven `route_color`, base tile layer suppressed once GTFS loads
- Slice 4: Mode sub-toggles — subway/bus/rail checkboxes in Map Settings, `transitModes` in Zustand store + localStorage + Supabase, `buildGtfsRouteTypeFilter` + `buildBaseTileFilter` in MapView

**Skipped:** Slice 3 (auto-trigger on place add) and Slice 5 (multi-city validation) still pending.

**Known gaps / next up:**
- Slice 3: Auto-trigger GTFS fetch when user adds a place in a new city (currently only fetches on map load)
- Slice 5: Validate Bangkok, Singapore, HK rendering
- Bus route density at low zoom (may need zoom-level gating)

---

## Existing map architecture (reference)

- **Map libraries:** mapbox-gl + maplibre-gl, switchable via `NEXT_PUBLIC_MAP_PROVIDER`
- **Style resolution:** `lib/map/styleResolver.ts` — returns style URL + transit tile config per provider/layer/tone
- **Layer store:** `lib/state/useMapLayerStore.ts` (Zustand) — default/transit/terrain, persisted to localStorage + Supabase
- **Transit rendering:** Both `MapView.mapbox.tsx` and `MapView.maplibre.tsx` add `transit-lines` + `transit-stops` layers from base tile data
- **Transit configs:** Three presets in styleResolver (MAPBOX_TRANSIT, CARTO_VECTOR_TRANSIT, PMTILES_TRANSIT) with mode-level filtering only
- **Slot-aware map pins:** `components/map/placeMarkerRing.ts` resolves ring color from item schedule fields via `lib/slots.ts`
- **PMTiles:** City-specific archives in `/public/map/` (nyc, bangkok, singapore, hk) with protocol registration in `lib/map/pmtilesProtocol.ts`
- **Toggle UI:** Settings popover in `PaperHeader.tsx` (HeaderActions) — 3-way layer radio + transit checkbox

Previous map layer work: [`docs/archive/MAP_LAYER_SLICES.md`](./archive/MAP_LAYER_SLICES.md) (Slices 1–3 shipped)

---

## Docs structure

- **`docs/`** — active shapes, living references, context
- **`docs/archive/`** — shipped/superseded specs (Phase 2, Phase 3 contracts, collab slices, map layer slices, plan page slices, light mode spec)
