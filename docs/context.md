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

## Next up: Per-Line Transit Layer

Full shape: [`docs/TRANSIT_LINES_SHAPE.md`](./TRANSIT_LINES_SHAPE.md)

**What it does:** Replaces the current "all subway is purple" transit layer with per-line rendering using official route colors (MTA blue for A/C/E, red for 1/2/3, etc.). Auto-discovers transit data via Transitland API when users add places in new cities. Adds sub-toggles for subway/bus/rail.

**Key architecture decisions:**
- **Data source:** Transitland REST API (open-source, 2,500+ GTFS feeds). Not raw GTFS parsing, not OSM.
- **Caching:** Per metro area in Supabase Storage. One Transitland call per metro area, ever (until TTL).
- **Rendering:** GeoJSON sources added dynamically to MapView, data-driven styling via `route_color` property.
- **Degradation:** Cities without GTFS data fall back to existing base-tile transit layer. No error, no empty state.

**Slices (in order):**
1. GTFS proxy endpoint — the proving ground (validate Transitland data quality)
2. Per-line subway rendering — NYC proof of concept
3. Auto-trigger on place add — background discovery
4. Mode sub-toggles — subway/bus/rail independent toggles
5. Multi-city validation — Bangkok, Singapore, HK

**Open questions:** Transitland rate limits, bus route density at low zoom, metro area key strategy (grid snap vs boundaries).

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
