# Active Work Context

## Active: Social Discovery Pipeline

Full spec: [`docs/SOCIAL_DISCOVERY_PIPELINE.md`](./SOCIAL_DISCOVERY_PIPELINE.md)

Async ingestion of social content (vlogs, blogs, TikToks) → structured place data with persona classification → persona-filtered hype signals on the map.

**Key architectural decisions:**
- Reuses existing `places` table (no new place table). Social places owned by a fixed system user UUID.
- New tables: `social_sources` (content metadata), `social_mentions` (place ↔ source join with snippets)
- New enum: `persona_enum` (local, luxury, budget, design, foodie, adventure, family, nightlife)
- AI strictly async (ingestion pipeline only). Map UI driven by deterministic Postgres RPC.

| Slice | What | Status |
|-------|------|--------|
| S1 | Schema: `persona_enum`, `social_sources`, `social_mentions`, system user RLS | **TODO** |
| S2 | Ingestion API: transcript → LLM → Google Places → upserts | **TODO** |
| S3 | Query RPC: `discover_social_places` (counts, persona filter, snippets) | **TODO** |
| S4 | Map UI: persona chips, mention-scaled markers, PlaceDrawer mentions section | **TODO** |

---

## Recently shipped (reference)

### UI Observations Polish (2026-04-02)
- Slot tokens, onboarding anchor, trip date defaults, backlog scroll, week grid, map pin rings, day detail outlines

### Per-Line Transit Layer (Slices 1, 2, 4)
- GTFS proxy, per-line subway rendering, mode sub-toggles. Shape: `docs/archive/TRANSIT_LINES_SHAPE.md`
- Transit coverage gaps (HK, Paris, Delhi, etc.) paused — plan at `docs/TRANSIT_COVERAGE_PLAN.md`

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
