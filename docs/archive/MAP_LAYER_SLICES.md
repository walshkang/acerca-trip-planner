# Map Layer Toggle — Slices

> Shape Up style: bounded slices, vertical cuts.
> Adds a Google Maps-style layer switcher that syncs across all map instances.

## Architecture Target

```
ExploreShellPaper / PlannerShell
├── PaperHeader
│   └── HeaderActions (settings popover — layer picker added here)
├── MapShell → MapView (mapbox or maplibre)
├── MapInset (planner)
└── useMapLayerStore (Zustand — single source of truth for active layer)
```

**Shared state:** `useMapLayerStore` holds the active layer. Both `MapShell` and `MapInset` subscribe.

**Layer options (base styles):**
| Layer | Mapbox | MapLibre (Carto) |
|-------|--------|------------------|
| Default | `light-v11` / `navigation-night-v1` | positron / dark-matter |
| Satellite | `satellite-streets-v12` | MapTiler hybrid (env key) |
| Terrain | `outdoors-v12` | Carto Voyager |

**Transit** stays as the existing checkbox toggle (not a base layer).

---

## Slice 1 — Layer Toggle UI + Sync (Cursor)

**Cursor prompt:** `cursor-prompts/map-layer-toggle.md`

**Goal:** Layer picker in the existing settings popover. Zustand store syncs selection across MapView + MapInset.

**Creates:** `lib/state/useMapLayerStore.ts`
**Modifies:** `lib/map/styleResolver.ts`, `components/map/MapShell.tsx`, `components/map/MapInset.tsx`, `components/paper/PaperHeader.tsx`, `components/app/ExploreShellPaper.tsx`

### Acceptance
- [ ] Layer picker appears in settings popover (3 buttons: Default, Satellite, Terrain)
- [ ] Selecting a layer changes the base map style immediately
- [ ] MapInset reflects the same layer as the main map
- [ ] Default layer matches current behavior exactly (no visual regression)
- [ ] Existing transit/neighborhood checkboxes still work

---

## Slice 2 — Transit from Tile Data (Cursor — deferred)

> **Deferred:** The app already has transit line/station overlays via GeoJSON. Those are NYC-specific. This slice would replace them with transit data from the vector tiles themselves (Mapbox streets tiles include transit layers, Carto/OSM tiles have some transit data). This is a research + implementation task — start after S1 is solid.

**Goal:** Show transit lines/stops from vector tile source layers, not hardcoded GeoJSON. Scalable to any city.

**Approach:**
- Mapbox streets style already includes transit layers — they just need to be made visible/styled
- For MapLibre/Carto: investigate what transit data is in the OpenMapTiles schema (`transportation` source-layer has road/rail classes)
- Toggle via existing `showTransit` boolean prop (no new UI needed)

### Acceptance
- [ ] Transit lines visible without city-specific GeoJSON
- [ ] Works in any city, not just NYC
- [ ] Clean on/off toggle via existing checkbox

---

## Slice 3 — Per-User Persistence (Claude Code + Cursor)

**Claude Code:** Migration done — `supabase/migrations/20260326000001_create_user_preferences.sql`
**Cursor prompt:** `cursor-prompts/map-layer-persistence.md`

**Goal:** Save the user's layer preference across sessions.

**Migration (done):** `user_preferences` table with `map_layer` column, RLS policies, `updated_at` trigger.
**Cursor work:** API route (`app/api/user/preferences/route.ts`), store hydration + debounced save, localStorage fallback.

### Acceptance
- [ ] Logged-in user's layer choice persists across browser sessions
- [ ] Logged-out users fall back to localStorage
- [ ] No extra network request on every layer toggle (debounced)
- [ ] Map renders immediately with default, updates when preference loads
