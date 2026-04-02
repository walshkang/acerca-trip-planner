# Phase 2 Plan: The Interactive Planner (Birthday Cake)

This document decomposes Phase 2 into small, testable slices so implementation stays deterministic and simple.

## Goal
- Enable deterministic trip planning on top of the approved places graph: backlog, scheduled days, and done.

## Non-Goals
- AI-driven routing or optimization (Phase 3).
- Re-enrichment or mutation of frozen AI data.
- Cross-user collaboration or sharing.

## Invariants
- DB is source of truth; map pins are truth.
- LLMs only translate intent into structured filters; deterministic systems execute queries.
- Enrich once, read forever. User edits never overwrite frozen enrichment.
- Strict taxonomy: UI icons must match enums exactly.

## Phase 2 Epics

### P2-E1 Stateful Planning (Kanban)
Spec: `docs/PHASE_2_KANBAN_SPEC.md` (slot planner UX + move semantics + API contract).

#### Data Model (proposed)
- `list_items`
  - `scheduled_date DATE` (NULL = Backlog)
  - `scheduled_start_time TIME` (MVP: slot sentinel = Morning/Afternoon/Evening)
  - `scheduled_end_time TIME` (optional; later for precise times)
  - `scheduled_order DOUBLE PRECISION` (fractional ordering within a lane: scheduled_date + slot + category)
  - `completed_at TIMESTAMPTZ` (NULL = not Done)
  - `last_scheduled_at TIMESTAMPTZ`
  - `last_scheduled_by UUID` (auth.users)
  - `last_scheduled_source TEXT` (e.g., "drag", "tap_move", "quick_add", "api")
- Indexes
  - `(list_id, scheduled_date, scheduled_order)`
  - `(list_id, completed_at)`
- RLS: inherited via list ownership, same as current list_items policy.
Notes:
- Use fractional ordering to avoid reindexing large ranges during reorders.
- Renormalize when gaps become too small.
- If list-based scheduling is trip-oriented, add optional `lists.start_date`, `lists.end_date`, and `lists.timezone` to define day buckets.

#### API / RPC
- `GET /api/lists/[id]/items`
  - Returns list items with place summary + scheduling fields.
- `PATCH /api/lists/[id]/items/[itemId]`
  - Updates scheduling fields only (date/time/order/completed_at).
  - Accepts composite updates (date + order) to avoid flicker/race conditions.
  - Validates: item belongs to list; no enrichment fields touched.
- Optional RPC: `schedule_list_item` for transactional updates (server-side).

#### UI
- Planner view uses the existing map-first Context Panel (keep list context close while planning):
  - Desktop: split layout (Places left; Plan right).
  - Mobile: single-pane bottom sheet with a `Places | Plan` toggle; Plan renders as a vertical agenda.
- Day buckets are split into 3 slots: Morning / Afternoon / Evening.
- Within each slot, items render in a deterministic category order (fixed):
  - Food → Coffee → Sights → Activity → Shop → Drinks
- Moving items between buckets updates scheduling fields only (desktop DnD; mobile tap-to-move via `Move` picker).
- Map pins show scheduled vs unscheduled styling when a list is active.
Notes:
- If `lists.start_date` and `lists.end_date` exist, render those day columns using `lists.timezone`.
- Slot encoding (MVP): store slot as a sentinel `scheduled_start_time` value:
  - Morning = `09:00`, Afternoon = `14:00`, Evening = `19:00` (list-local; no timezone math required since it is a slot label).

#### Taxonomy: Drinks (required for slot ordering)
- Add `Drinks` to `category_enum` so bars are a first-class place type (icon + filters + deterministic grouping).
- Deterministic mapping (fallback + LLM contract): Google types like `bar`, `night_club`, `wine_bar`, etc should normalize to `Drinks` (not `Food`).
- Optional (later): versioned backfill to reclassify existing approved bar places without mutating frozen enrichment (schema_version bump + new enrichment rows).

#### Acceptance Criteria
- Moving an item between buckets only changes scheduling fields.
- Backlog vs Scheduled derived from `scheduled_date` (NULL vs set).
- Done derived from `completed_at` (set = Done).
- Refresh restores server truth; optimistic updates reconcile cleanly.
- Morning/Afternoon/Evening are derived from the slot sentinel; empty slot renders consistently.
- Bars appear under `Drinks` when categorized as such; planner never uses freeform strings for type.

#### Execution Plan (first chunk: Mobile Planner MVP)
Goal: ship a usable mobile planner that schedules list items without drag-and-drop.

**Backend**
- Add scheduling write path: `PATCH /api/lists/[id]/items/[itemId]`
  - Auth + ownership validation.
  - Accept `scheduled_date`, `slot`, `scheduled_order`, `completed`, optional `source`.
  - Map `slot` → sentinel `scheduled_start_time` (`09:00`/`14:00`/`19:00`).
  - Enforce “scheduling fields only” updates + audit fields (`last_scheduled_*`).
  - Mobile uses `source="tap_move"` (desktop DnD uses `source="drag"`).
- Add list trip-date write path: `PATCH /api/lists/[id]`
  - Update `start_date`, `end_date`, `timezone` (IANA).
  - Validate `start_date <= end_date` when both are set.

**Mobile UI (Context Panel)**
- Add a `Plan` mode to the mobile Context Panel switcher: `Places | Plan | Details`.
- Plan renders as a vertical agenda: Backlog → (Day → Morning/Afternoon/Evening) → Done.
- If trip dates are unset: show a CTA to set dates and render Backlog + Done only (no day drop targets).
- Each item row exposes a `Move` affordance:
  - Opens an in-panel destination picker (Backlog / Done / Day → Slot).
  - Default insertion: append-to-end of the destination category group; no mobile reordering in v1.
  - Optimistic update + saving state; on failure revert + factual error.
- Animations: calm, subtle, and state-revealing (lift → slide → settle + destination highlight); respect `prefers-reduced-motion`.

**Desktop (explicitly deferred in this chunk)**
- Drag-and-drop and within-slot reordering UX.
- Reorder insert-between-neighbors (fractional ordering) UI.

**Testing + verification**
- Unit: slot mapping helpers; planner bucketing/grouping + deterministic category ordering.
- API: `PATCH` rejects unauthenticated + non-owned items; updates only scheduling fields (tags unaffected).
- E2E: mobile `Move` schedules into a day+slot, persists after reload, and supports Done/Backlog moves.
- Manual smoke: map remains interactive, no stacked drawers, and Back behavior is predictable.

#### Execution Plan (chunk 2: Desktop DnD + Reorder)
Goal: make the planner fast on desktop with drag-and-drop + deterministic ordering.

**UI**
- Add `Details | Plan` toggle in the Context Panel right pane (list stays visible on the left).
- Render the planner as a board:
  - Backlog + Done lanes
  - Day columns (bounded by `lists.start_date`/`end_date`)
  - Within each day: 3 slot lanes (Morning/Afternoon/Evening) with deterministic category grouping.

**DnD + ordering**
- Implement drag between buckets + reorder within a bucket.
- Compute `scheduled_order` via fractional insertion (between neighbors / start / end) and persist via the same `PATCH` route.
- Set `last_scheduled_source="drag"` for DnD writes.
- Guardrails: do not allow category changes; categories remain derived from `place.category`.

**Testing + verification**
- Unit: ordering helper (neighbors → new order), plus planner bucketing determinism.
- E2E (desktop): drag Backlog → Day/Slot, drag reorder within slot, reload persists.

#### Execution Plan (chunk 3: Mobile polish + optional reorder)
Goal: reduce friction on mobile without introducing stacked drawers or fragile gestures.

**Move UX**
- Improve the Move picker with fast paths:
  - “Today” shortcut (list-local date) when within the trip range.
  - Quick actions: “Backlog”, “Done”.
- Optional: add mobile reordering without DnD (e.g., “Move up/down” within a slot) while keeping deterministic ordering rules.

**Trip dates UX**
- Add a minimal trip dates editor reachable from the Plan CTA when dates are unset (writes `PATCH /api/lists/[id]`).

**Quality**
- Keep animations calm and state-revealing; respect `prefers-reduced-motion`.
- Ensure no surprise camera moves and no stacked overlays.

### P2-E2 Deterministic Filtering & Intent Translation

#### Filter JSON Schema (owned by server)
- Allowed filters (initial set):
  - `category[]`, `energy[]`
  - `tags[]` (list-scoped tags from P2-E3)
  - `open_now` (boolean)
  - `within_list_id` (scope to a list)
- Boolean semantics (baseline; match existing list filters):
  - OR within each array (`category[]`, `tags[]`, `energy[]`).
  - AND across keys (e.g., `category[]` AND `tags[]` AND `open_now`).
  - Category remains a strict enum (icons ↔ enums); tags remain list-scoped and do not compete with category.
- Schema lives in `lib/filters/schema.ts` with runtime validation.

#### Intent Translation
- `POST /api/filters/translate`
  - Input: free-text intent + optional list_id
  - Output: validated filter JSON
  - LLM allowed only here; strict validation required.

#### Query Execution
- `POST /api/filters/query`
  - Input: filter JSON + list_id
  - Output: matching places/list_items
  - Queries are deterministic, built server-side only.

#### Open Now
- Use `places.opening_hours` + place timezone.
- Add `places.timezone TEXT` (IANA) or `places.utc_offset_minutes INTEGER`.
- Resolve timezone at ingest via deterministic lookup; do not call LLM.
Note:
- For Phase 2, implement Open Now as a client-side filter using server time + stored timezone.
  If server-side filtering is needed later, precompute normalized opening intervals at ingest.

#### Acceptance Criteria
- Filter JSON is the only LLM output; invalid schemas are rejected.
- Filtering is reproducible across clients.
- Open-now results are consistent with server time + stored timezone.
- Server-side filters preserve the current UI semantics (no parallel filter language).

### P2-E3 List Workspace + Tags

#### Data Model (proposed)
- `list_items.tags TEXT[]` (list-scoped tags per place)
- GIN index on `list_items.tags` for filtering.
Notes:
- Normalize tags (trim + lowercase) on write to avoid duplicates like "Coffee" vs "coffee".
- List membership is many-to-many; the UI should use add/remove semantics (not "move").
- Add-time tag seeding: when adding a place to a list, seed `list_items.tags` with normalized enrichment tags and union with any user-provided tags (without mutating enrichment records).

#### API
- `PATCH /api/lists/[id]/items/[itemId]/tags`
  - Updates tags array only.
- `GET /api/lists/[id]/tags`
  - Returns distinct tags for the list (for filter chips).
- `POST /api/lists/[id]/items`
  - Adds `{ place_id, tags? }` to the list (idempotent; returns existing row on conflict).
  - If tags are omitted or empty, seed from enrichment tags when available.
  - If tags are provided, union with seeded tags and normalize.
- `DELETE /api/lists/[id]/items?place_id=...`
  - Removes a place from a list by place_id (idempotent).
- `GET /api/places/local-search?q=...`
  - Searches canonical places for list add flow (name + category; display_address nullable).
  - Returns deterministic ordering: exact → prefix → contains.
  - Keyword search only (no URL parsing); short queries return empty results.

#### UI
- List detail view shows:
  - Scrollable list of places with inline tag editor.
  - Local search to add existing places to the list (canonical-only).
  - Add-time tags input for list items added from search results.
  - Tag chips are a single set; per-chip remove + clear-all; empty chip set clears tags.
  - Tag filter chips scoped to the list.
  - Multi-select semantics explicitly defined (default: OR).
  - Search results dropdown renders in a portal to avoid clipping/overlap with drawers.
- Place drawer shows list membership as checkboxes/chips (add/remove semantics).

#### Acceptance Criteria
- Tags are list-scoped (same place can have different tags in different lists).
- Tags never overwrite `places.user_tags` or enrichment data.
- Tag filter chips update the list view deterministically.
- List membership writes are idempotent (re-adding/removing does not error).
- Clearing all tags persists the empty tag set.

## Map-First UX Additions (Phase 2 refinements)

### UI/UX Track A — Slate Glass System (done)
- Apply Slate/Stone/Ice glass styling to all map overlays (Omnibox, inspector, list drawer, place drawer, and map shell pills).
- Keep existing overlay layout + measurement invariants (place drawer offset stays tied to inspector height).
- Update contrast on text/inputs so readability stays high on dark glass surfaces.
 - Status: Done (2026-02-02).

### UI/UX Track B — Warm Glass Light Mode (implemented)
- Keep overlays glass-based in light mode (warm-tinted glass), not opaque paper blocks.
- Reserve focus-linkage blue for marker/list/details linkage semantics.
- Keep preview/ghost styling clearly distinct from approved truth.
- Preserve layering contract: Map → Context Panel → Tools Sheet → transient toasts.
- Keep overlay readability high across light and dark base map styles.
- Spec source: `docs/LIGHT_MODE_UI_SPEC.md`.
- Status: Implemented (2026-02-25); verification complete (2026-02-25).

### List Drawer Overlay (Map stays primary, done)
- Provide a drawer/overlay next to the map (do not navigate away by default).
- Reuse a presentational list detail body component across `/lists/[id]` and the drawer.
- Selecting a list should not re-fetch all places; only fetch list_items to derive place_ids.
- Highlight/filter pins in memory from existing `places_view` data.
- Keep Omnibox results above the drawer via a predictable overlay layer.
- Add list creation inline in the map drawer (reuse `/api/lists` POST).
- Omnibox results should render in a portal to avoid clipping by drawer overflow.
- Creating or switching to an empty list must not change the map camera.
- Add a sign-out affordance within the map shell (non-blocking placement).
 - Status: Done (2026-02-02).

### Search Location Bias (no extra calls, done)
- Add optional `lat`, `lng`, `radius_m` to `/api/places/search`.
- For Find Place (legacy), use `locationbias=circle:radius@lat,lng`.
- Increase result limit up to max 10 without extra API calls; larger result sets require Text Search (future).
 - Status: Done (2026-02-02).

### Place Drawer + URL State (done)
- Marker click opens the place drawer without leaving the map.
- Drawer state is driven from the URL (`/?place=<id>`) to preserve deep links.
- Closing the drawer clears the URL state and returns to the base map route.
- Back/Forward toggles drawer open/close via URL history.
- Approve flow and list detail clicks update URL state (no navigation away from the map).
- `/places/[id]` remains the full detail page (notes/tags + list membership).
- Status: Done (2026-02-03).

### Default Map View Policy (done)
- If `lastActiveListId` is set, fit bounds to that list’s places.
- Else if `lastAddedPlaceId` is set, flyTo that place.
- Else fall back to saved viewport.
- Avoid global-scale fitBounds; prefer the active list or last place when clusters are far apart.
 - Status: Done (2026-02-02).

### MapLibre Feasibility (done)
- Feature-flag provider (`NEXT_PUBLIC_MAP_PROVIDER=mapbox|maplibre`, default maplibre).
- Split renderers: `MapView.mapbox.tsx` and `MapView.maplibre.tsx`, both `forwardRef` to preserve `mapRef` behavior.
- Move all Marker rendering (including GhostMarker) into the renderer to avoid mixed provider imports.
- Make behavior layer provider-agnostic (remove `mapbox-gl` types; replace `LngLatBounds` + `distanceTo` usage).
- Make token gating provider-aware: require `NEXT_PUBLIC_MAPBOX_TOKEN` only for Mapbox.
- Add a minimal MapLibre style JSON for the spike and optional PMTiles protocol wiring + style JSON for staged assets.
- Add PMTiles runtime fallback (PMTiles → Carto) and dynamic overlay anchor resolution so transit/neighborhood layers remain stable across style sources.
- Document the optional Playwright run with `NEXT_PUBLIC_MAP_PROVIDER=mapbox`.
- Acceptance: MapLibre mode loads without Mapbox token; marker click opens drawer and updates `?place=`.
- Status: Done (2026-02-25).

### Map Customization (done)

#### Transit Overlay (NYC first, runtime GeoJSON)
- Use static GeoJSON assets under `public/map/overlays/` (lines + optional stations).
- Render as non-interactive overlay layers inside `MapView.*` so marker clicks remain reliable.
- Toggle lives inside the right overlay (pointer-events-auto) and increases the measured inspector height by design.
- Lazy-load GeoJSON on first toggle; cache after load to keep initial map boot fast.
- Acceptance: marker click still opens the place drawer with transit enabled (Mapbox + MapLibre).
- Status: Done (2026-02-03).

#### Map Style Selection (map-only)
- Map style changes do not affect the dark glass UI (map-only selection).
- Provide a dark style for Mapbox and a corresponding MapLibre style JSON.
 - Use a MapLibre "label sandwich" (dark_nolabels → overlays → dark_only_labels) for cleaner overlays.
 - Status: Done (2026-02-03).

#### Neighborhood Boundaries (NYC)
- Start as static GeoJSON under `public/map/overlays/` and render as runtime overlay layers.
- Optional future slice: DB-backed ingestion if needed (separate schema + RLS).
- Status: Done (2026-02-03).

## Sequencing (recommended)
0. UI/UX Track A: apply Slate Glass overlays (Omnibox, inspector, list/placedrawers, pills) without changing layout invariants. (done)
1. Read-only list detail API + view (done).
2. Map drawer overlay + active list selection state. (done)
3. Search location bias using map center + radius. (done)
4. Default map view policy (active list → last place → saved viewport). (done)
5. Place drawer URL state + route reconciliation (done).
6. MapLibre feasibility spike (flag + renderer split + provider-agnostic bounds + minimal style). (done)
7. Transit overlay (NYC GeoJSON, runtime layers, toggle in right overlay). (done)
8. Map style selection (map-only dark style). (done)
9. Neighborhood boundaries (NYC GeoJSON, runtime layers). (done)
10. List add flow: local search + add with tags, list drawer create list. (done)
11. Tagging UI + API updates (P2-E3) including add-time tag seeding. (done)
12. Map camera stability + overlay layering + sign-out placement. (done)
13. Scheduling UI + API updates (P2-E1).
14. Filter translation + query pipeline (P2-E2).
15. UI/UX Track B: warm-glass light-mode alignment (semantics + chrome + motion; no surface-model changes). (implemented; verification complete (2026-02-25))

## Testing & Verification
- Unit tests for filter schema validation and query builder.
- API tests for scheduling and tag endpoints (ownership + validation).
- UI tests: scheduling updates persist (desktop DnD; mobile Move picker); tag editing persists.
- Manual smoke:
  - Open place drawer from marker → URL updates; close clears URL state.
  - Approve from Inspector stays on map and opens drawer via URL state.
  - Switch active list → map remains static on empty list, recenters on non-empty.
  - Search while map is in Hong Kong → results bias to that area.
  - Add/remove list membership → list item appears/disappears without errors.
  - MapLibre mode (provider flag) loads without Mapbox token; marker click opens drawer and updates `?place=`.
  - Transit overlay enabled → marker click still opens the place drawer.
