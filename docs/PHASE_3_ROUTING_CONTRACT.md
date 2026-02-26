# Phase 3 Routing Contract (P3-E1 / 1.3)

## Goal
- Define a deterministic, server-owned routing preview contract for scheduled list items.
- Establish a stable success data model for itinerary legs, travel-time badges, and summary totals before real provider integration.

## Non-Goals (Task 1.3)
- No route optimization or itinerary reordering.
- No UI rendering changes.
- No schema migration.
- No partial-leg success mode (all-or-nothing validation for provider success payloads).

## Invariants
- Deterministic compute only (no LLM routing logic).
- List scheduling data remains source of truth.
- Route compute is server-side only.
- Contract behavior is reproducible for the same inputs.

## Endpoint
- `POST /api/lists/[id]/routing/preview`

## Request Contract
- Body must be a JSON object.
- Allowed keys:
  - `date` (required): `YYYY-MM-DD`
  - `mode` (optional): `"scheduled"` (default)
- Unknown keys are rejected with `code: "invalid_routing_payload"`.

### Time Semantics
- `date` is a list-local calendar token (`YYYY-MM-DD`).
- The server does not reinterpret `date` through UTC offsets.
- Route selection uses direct equality against scheduled item date values.

### Trip Bounds Semantics
- If both `start_date` and `end_date` are null, all dates are allowed.
- If only `start_date` exists, `date >= start_date` is required.
- If only `end_date` exists, `date <= end_date` is required.
- If both exist, range is inclusive.
- Violations return `code: "date_outside_trip_range"`.

## Data Selection Rules
- Source rows: `list_items` for the list where:
  - `scheduled_date = date`
  - `completed_at IS NULL`
- Place metadata sourced from joined `places_view` (`name`, `category`, `lat`, `lng`).
- Fallback path is allowed when joined relation resolution fails:
  - Query `list_items`, then hydrate via `places_view` by `place_id`.

## Deterministic Sequencing

### Slot Rank
- `09:00` (morning): `0`
- `14:00` (afternoon): `1`
- `19:00` (evening): `2`
- null/unknown slot (`unslotted`): `3`

### Comparator Order
1. slot rank
2. category rank (planner category order)
3. `scheduled_order` ascending (`null` treated as `0`)
4. `created_at` ascending
5. `item_id` ascending

### Routeability
- Routeable item requires finite numeric `lat` and `lng`.
- Non-routeable items are returned in `unroutableItems` with reason `missing_coordinates`.

### Leg Drafting
- Legs are adjacent pairs across routeable sequence only.
- Provider metrics are merged onto these deterministic draft legs by `index` only.

## Success Leg Model (Task 1.3)
- Success legs contain deterministic adjacency identity plus normalized metrics:
  - `index`
  - `from_item_id`
  - `to_item_id`
  - `from_place_id`
  - `to_place_id`
  - `distance_m` (integer, meters)
  - `duration_s` (integer, seconds)
  - `travel_time_badge_minutes` (integer)
  - `travel_time_badge_short` (string, e.g. `"8m"`)
  - `travel_time_badge_long` (string, e.g. `"8 min"`)
- Metric normalization:
  - Metrics must be finite and non-negative before normalization.
  - Server normalizes with `Math.round` and clamps at `0`.

### Badge Derivation
- If `duration_s === 0`:
  - `travel_time_badge_minutes = 0`
  - `travel_time_badge_short = "0m"`
  - `travel_time_badge_long = "0 min"`
- If `duration_s > 0`:
  - `travel_time_badge_minutes = max(1, round(duration_s / 60))`
  - `travel_time_badge_short = "<N>m"`
  - `travel_time_badge_long = "<N> min"`

## Response Modes

### 200: Insufficient Routeable Items
- Condition: routeable sequence size `< 2`.
- Payload:
  - `status: "insufficient_items"`
  - `canonicalRequest`
  - `list`
  - `sequence`
  - `unroutableItems`
  - `legs: []`
  - `summary` (`total_distance_m`/`total_duration_s` are `null`)

### 200: Provider Success
- Condition: provider returns success metrics for every deterministic draft leg and validation passes.
- Payload:
  - `status: "ok"`
  - `provider`
  - `canonicalRequest`
  - `list`
  - `sequence`
  - `unroutableItems`
  - `legs` (computed legs with distance/duration/badges)
  - `summary` (`total_distance_m`/`total_duration_s` are non-null integer totals)

### 501: Provider Unavailable
- Condition: routeable sequence size `>= 2` and provider integration path is unavailable.
- Payload:
  - `code: "routing_provider_unavailable"`
  - `status: "provider_unavailable"`
  - `message`
  - `canonicalRequest`
  - `list`
  - `sequence`
  - `unroutableItems`
  - `legs` (deterministic adjacent pairs)
  - `summary` (`total_distance_m`/`total_duration_s` are `null`)

## Provider Success Validation Rules
- Provider leg metrics count must equal deterministic draft leg count.
- Indices must be unique, integer, and in range `[0, leg_count - 1]`.
- Metrics must be finite and non-negative prior to normalization.
- Validation failure maps to `500` with `code: "internal_error"` (contract stability from Task 1.2).

## Error Payload Contract
- Standard error fields:
  - `code`
  - `message`
  - optional `fieldErrors`
  - optional `lastValidCanonicalRequest`

### Codes
- `invalid_routing_payload` (400)
- `date_outside_trip_range` (400)
- `unauthorized` (401)
- `not_found` (404)
- `internal_error` (500)

## Acceptance Checks (Task 1.3)
- Existing 400/401/404/501 behavior remains unchanged.
- `<2` routeable items still return `status: "insufficient_items"`.
- Valid provider success returns `status: "ok"` with computed legs and non-null totals.
- `duration_s = 0` yields `0m` and `0 min`.
- Float metrics are normalized to integers.
- Invalid provider success payload (count/index/value) returns `500 internal_error`.
