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

#### Data Model (proposed)
- `list_items`
  - `scheduled_date DATE` (NULL = Backlog)
  - `scheduled_start_time TIME` (optional)
  - `scheduled_end_time TIME` (optional)
  - `scheduled_order DOUBLE PRECISION` (fractional ordering within a day)
  - `completed_at TIMESTAMPTZ` (NULL = not Done)
  - `last_scheduled_at TIMESTAMPTZ`
  - `last_scheduled_by UUID` (auth.users)
  - `last_scheduled_source TEXT` (e.g., "drag", "quick_add", "api")
- Indexes
  - `(list_id, scheduled_date, scheduled_order)`
  - `(list_id, completed_at)`
- RLS: inherited via list ownership, same as current list_items policy.
Notes:
- Use fractional ordering to avoid reindexing large ranges on drag-and-drop.
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
- New list detail view `app/lists/[id]/page.tsx` with two panes:
  - Left: scrollable list of places in the list.
  - Right: Kanban day buckets (Backlog / Scheduled by date / Done).
- Drag-and-drop between buckets updates scheduling fields only.
- Map pins show scheduled vs unscheduled styling when a list is active.
Notes:
- If `lists.start_date` and `lists.end_date` exist, render those day columns using `lists.timezone`.

#### Acceptance Criteria
- Moving an item between buckets only changes scheduling fields.
- Backlog vs Scheduled derived from `scheduled_date` (NULL vs set).
- Done derived from `completed_at` (set = Done).
- Refresh restores server truth; optimistic updates reconcile cleanly.

### P2-E2 Deterministic Filtering & Intent Translation

#### Filter JSON Schema (owned by server)
- Allowed filters (initial set):
  - `category[]`, `energy[]`
  - `tags[]` (list-scoped tags from P2-E3)
  - `open_now` (boolean)
  - `within_list_id` (scope to a list)
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
  - Searches canonical places for list add flow (name/address, minimal fields only).

#### UI
- List detail view shows:
  - Scrollable list of places with inline tag editor.
  - Local search to add existing places to the list (canonical-only).
  - Add-time tags input for list items added from search results.
  - Tag filter chips scoped to the list.
  - Multi-select semantics explicitly defined (default: OR).
- Place drawer shows list membership as checkboxes/chips (add/remove semantics).
 - Wikipedia summaries are shown only for Sights (preview + detail).

#### Acceptance Criteria
- Tags are list-scoped (same place can have different tags in different lists).
- Tags never overwrite `places.user_tags` or enrichment data.
- Tag filter chips update the list view deterministically.
- List membership writes are idempotent (re-adding/removing does not error).

## Map-First UX Additions (Phase 2 refinements)

### List Drawer Overlay (Map stays primary)
- Provide a drawer/overlay next to the map (do not navigate away by default).
- Reuse a presentational list detail body component across `/lists/[id]` and the drawer.
- Selecting a list should not re-fetch all places; only fetch list_items to derive place_ids.
- Highlight/filter pins in memory from existing `places_view` data.
- Keep Omnibox results above the drawer via a predictable overlay layer.
- Add list creation inline in the map drawer (reuse `/api/lists` POST).

### Search Location Bias (no extra calls)
- Add optional `lat`, `lng`, `radius_m` to `/api/places/search`.
- For Find Place (legacy), use `locationbias=circle:radius@lat,lng`.
- Increase result limit up to max 10 without extra API calls; larger result sets require Text Search (future).

### Place Drawer + URL State
- Marker click should open a place drawer without leaving the map.
- Drive drawer state from the URL (`/?place=<id>` or shallow `/places/[id]`) to preserve deep links.
- Closing the drawer clears the URL state; `/places/[id]` remains valid for direct navigation.

### Default Map View Policy
- If `lastActiveListId` is set, fit bounds to that list’s places.
- Else if `lastAddedPlaceId` is set, flyTo that place.
- Else fall back to saved viewport.
- Avoid global-scale fitBounds; prefer the active list or last place when clusters are far apart.

## Sequencing (recommended)
1. Read-only list detail API + view (done).
2. Map drawer overlay + active list selection state.
3. Search location bias using map center + radius.
4. Default map view policy (active list → last place → saved viewport).
5. Place drawer with URL state + list membership add/remove.
6. List add flow: local search + add with tags, list drawer create list.
7. Tagging UI + API updates (P2-E3) including add-time tag seeding.
8. Sights-only wiki summary gating (UI refinement).
9. Scheduling UI + API updates (P2-E1).
10. Filter translation + query pipeline (P2-E2).

## Testing & Verification
- Unit tests for filter schema validation and query builder.
- API tests for scheduling and tag endpoints (ownership + validation).
- UI tests: drag-and-drop updates schedule; tag editing persists.
- Manual smoke:
  - Create list → add places → schedule → refresh.
  - Add tags → filter by tags → verify results.
  - Toggle open-now filter with stored timezone.
  - Switch active list → map recenters to list cluster.
  - Search while map is in Hong Kong → results bias to that area.
  - Open place drawer from marker → URL updates and map stays visible.
  - Add/remove list membership → list item appears/disappears without errors.
