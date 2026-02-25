# Phase 3 Routing Contract (P3-E1 / 1.1)

## Goal
- Define a deterministic, server-owned routing preview contract for scheduled list items.
- Establish a stable request/response surface before provider integration.

## Non-Goals (Task 1.1)
- No OSRM / Google Routes integration.
- No UI rendering changes (travel-time badges come later).
- No itinerary optimization/reordering algorithm.
- No schema migration.

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
- No duration/distance computation in Task 1.1.

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

### 501: Provider Unavailable
- Condition: routeable sequence size `>= 2` and provider integration not yet implemented.
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

## Acceptance Checks (Task 1.1)
- Invalid payloads are rejected with field-level errors.
- Date-range behavior supports missing/partial/full bounds.
- Sequence order is deterministic for mixed slots/categories/orders.
- Unslotted items sort after evening.
- Missing coordinates become unroutable.
- Response mode is `insufficient_items` for `<2` routeable stops.
- Response mode is `provider_unavailable` (`501`) for `>=2` routeable stops.
