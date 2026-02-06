# Phase 2 Kanban (P2-E1): Slot Planner Spec

This is a concrete, deterministic spec for the Phase 2 planner UI and the minimal backend writes needed to support it.

## Goal
- Let users schedule saved places into a day plan while keeping the map and list context visible.
- Support a simple trip state machine: Backlog → Scheduled (by day + slot) → Done.

## Non-Goals (for MVP)
- Routing, travel-time optimization, or AI-generated itineraries.
- Freeform time editing; slots only (Morning/Afternoon/Evening).
- Re-enrichment or mutation of frozen enrichment data.

## Invariants
- DB is source of truth; UI is a projection of DB state.
- Scheduling changes update scheduling fields only (never enrichment/user notes/tags).
- Strict taxonomy: place type groupings must be backed by enums + icon sets (no freeform types).

---

## Access & Layout

### Primary entry point (map-first)
- Inside the existing map `ContextPanel` split layout:
  - Left pane: list places (existing list detail experience; search + filters).
  - Right pane: a new `Plan` mode that renders the slot planner.
- UI affordance: a small tab row or toggle in the right pane: `Details | Plan`.
  - `Details` keeps current place drawer / inspector behavior.
  - `Plan` shows the planner board for the currently active list.

### Secondary entry point (full page)
- `/lists/[id]` can reuse the same planner component in a wider layout.

---

## Data Model (existing fields)

### Source of truth fields (`list_items`)
- `scheduled_date DATE` (NULL = Backlog)
- `scheduled_start_time TIME` (slot sentinel; see below)
- `scheduled_order DOUBLE PRECISION` (fractional ordering within a slot+category bucket)
- `completed_at TIMESTAMPTZ` (NULL = not Done)
- Audit:
  - `last_scheduled_at TIMESTAMPTZ`
  - `last_scheduled_by UUID`
  - `last_scheduled_source TEXT` (use `"drag"` for DnD)

### Slot encoding (MVP)
Store slots as sentinel `scheduled_start_time` values:
- Morning = `09:00`
- Afternoon = `14:00`
- Evening = `19:00`

Rules:
- If `scheduled_date` is NULL, `scheduled_start_time` must be NULL.
- If `completed_at` is set, the item is in Done regardless of date/time (date/time may remain for history).
- Guardrail (MVP): `scheduled_start_time` is a slot label encoding only. It must not be interpreted as a user-intended clock time.

---

## Taxonomy: Drinks (bars)

### Requirement
- `Drinks` is a first-class place type (alcoholic, bars).
- Bars must normalize to `Drinks` (not `Food`).

### Plan
- Add `Drinks` to DB `category_enum`.
- Update icon mapping + exhaustive type lists (TypeScript).
- Update deterministic fallback + LLM normalization contract so Google Place types like `bar` / `night_club` map to `Drinks`.

Optional (later):
- Versioned backfill: re-normalize existing bar places by schema_version bump and new enrichment rows (no mutation of frozen records).

---

## Deterministic rendering rules (Planner)

### Day buckets
- If `lists.start_date` and `lists.end_date` exist, render inclusive day sections in list-local date strings.
- If missing, show a CTA: “Set trip dates to plan by day” and render only Backlog + Done (day scheduling is disabled until dates are set).

### Slots per day
- Each day has three lanes: Morning / Afternoon / Evening.

### Type ordering inside each slot
Render categories in a fixed order:
1. Food
2. Coffee
3. Sights
4. Activity
5. Shop
6. Drinks

Items are grouped by `place.category` and then ordered by:
- `scheduled_order` (ascending), then
- `created_at` (ascending) as a stable tie-breaker.

---

## Drag-and-drop behaviors

### Supported moves
- Backlog → (day, slot): schedules the item (requires trip dates; otherwise there are no day drop targets).
- (day, slot) → (day, slot): reschedules and/or reorders.
- Any → Done: marks completed.
- Any → Backlog: clears scheduling and completion.

### Category behavior
- Category is derived from `place.category` (DB truth).
- Users do not drag items between categories; categories are deterministic groups.
  - If a drop target is category-scoped, ignore a mismatched category target and treat it as a slot-level drop (insert at end of the correct category group in that slot).

### Ordering algorithm (fractional)
On insert/reorder within a bucket (same day + slot + category):
- Insert between neighbors: `(prevOrder + nextOrder) / 2`
- Insert at end: `lastOrder + 1`
- Insert at start: `firstOrder - 1`

Note:
- Renormalization can be added later if values converge.

---

## API Contract (writes)

### `PATCH /api/lists/[id]/items/[itemId]`
Purpose: update scheduling fields only (transactional per item).

Request (MVP):
- `scheduled_date`: `YYYY-MM-DD` | `null`
- `slot`: `"morning" | "afternoon" | "evening" | null`
- `scheduled_order`: `number | null`
- `completed`: `boolean | null`
- `source`: `"drag" | "quick_add" | "api"` (optional; default `"api"`)

Server behavior:
- Validate auth and ownership (item belongs to list; list belongs to user).
- Map `slot` → `scheduled_start_time` sentinel; reject unexpected values.
- Enforce: only scheduling fields + audit fields may change.
- Set audit fields:
  - `last_scheduled_at = now()`
  - `last_scheduled_by = auth.uid()`
  - `last_scheduled_source = source`
- Return updated item row (scheduling fields + ids).

---

## UI State & Reconciliation

### Optimistic updates
- Apply the move immediately in UI state.
- Fire the PATCH.
- On failure: revert the move and show an inline error.

### Refresh source of truth
- After a successful move, either:
  - Update local cache from returned row, or
  - Re-fetch `/api/lists/[id]/items` if we detect drift.

---

## Testing plan

### Unit (Vitest)
- Slot mapping helpers (slot ↔ sentinel time).
- Ordering helper (insert/reorder → scheduled_order).
- Planner bucketing/grouping + category ordering.

### API tests
- PATCH rejects unauthenticated.
- PATCH rejects item not in list / list not owned.
- PATCH updates only scheduling fields (tags unaffected).

### Playwright (E2E)
- Seed list with items across categories including a bar (Drinks) and an Activity.
- Open map → Lists → select list → Plan tab.
- Drag from Backlog to Morning; reload; verify persisted.
- Drag reorder within the same slot; verify persisted.
- Drag to Done; verify state.
- Drag back to Backlog; verify cleared date/slot/completed.

---

## Verification checklist (manual)
- Planner accessible from map without navigating away.
- Left list remains visible while planning.
- Dragging schedules into the correct day+slot.
- Slot/type ordering is deterministic and stable after refresh.
- Bars appear under Drinks.
- No enrichment/user edits are overwritten by scheduling changes.
