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

#### API
- `PATCH /api/lists/[id]/items/[itemId]/tags`
  - Updates tags array only.
- `GET /api/lists/[id]/tags`
  - Returns distinct tags for the list (for filter chips).

#### UI
- List detail view shows:
  - Scrollable list of places with inline tag editor.
  - Tag filter chips scoped to the list.
  - Multi-select semantics explicitly defined (default: OR).

#### Acceptance Criteria
- Tags are list-scoped (same place can have different tags in different lists).
- Tags never overwrite `places.user_tags` or enrichment data.
- Tag filter chips update the list view deterministically.

## Sequencing (recommended)
1. Schema updates + migrations + `npm run db:types`.
2. List detail view skeleton (read-only list items + place summaries).
3. Scheduling UI + API updates (P2-E1).
4. Tagging UI + API updates (P2-E3).
5. Filter translation + query pipeline (P2-E2).

## Testing & Verification
- Unit tests for filter schema validation and query builder.
- API tests for scheduling and tag endpoints (ownership + validation).
- UI tests: drag-and-drop updates schedule; tag editing persists.
- Manual smoke:
  - Create list → add places → schedule → refresh.
  - Add tags → filter by tags → verify results.
  - Toggle open-now filter with stored timezone.
