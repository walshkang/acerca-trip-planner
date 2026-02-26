# Phase 3 Discovery Contract (P3-E2 / 2.1-2.5)

## Goal
- Define a deterministic, server-owned discovery suggestion contract before implementation.
- Lock request/response/error semantics for a suggestion layer that preserves map-truth and Airlock approval boundaries.

## Non-Goals
- No additional UI behavior changes beyond map-shell suggest integration.
- No schema migration.
- No enrichment model changes.

## Invariants
- Deterministic systems retrieve/filter/rank suggestions.
- LLM usage is optional and summary-only; it must not change ranking/order.
- `suggest` is read-only and never writes canonical or staging tables.
- Approval remains the only promotion path to canonical truth.
- User edits and approvals never overwrite frozen enrichment payloads.
- Taxonomy remains strict (`Food | Coffee | Sights | Shop | Activity | Drinks`).

## Endpoints
- `POST /api/discovery/suggest` (read-only suggestion retrieval)
- `POST /api/places/discard` (reject/discard staged preview candidate)

## Implementation Status
- `P3-E2 / 2.1` completed: deterministic contract defined.
- `P3-E2 / 2.2` completed: verification gate defined.
- `P3-E2 / 2.3` completed: server-owned suggest endpoint implemented.
- `P3-E2 / 2.4` completed: optional summary path implemented with ranking isolation.
- `P3-E2 / 2.5` completed: map-first discovery UI now calls suggest; canonical hits open place details and non-canonical hits use preview ingest.
- `P3-E2 / 2.6` completed: discard path implemented; Close/Cancel/switching previews call discard then clear; enrichments are deliberately not deleted (EORF).
- `P3-E2 / 2.7` completed: automated tests for discard route and store discardAndClear; verification gate updated.

## Request Contract
- Body must be a JSON object.
- Allowed keys:
  - `intent` (required): non-empty string, max 500 chars after trim.
  - `list_id` (optional): UUID string; when provided, must be readable by the authenticated user.
  - `lat` (optional): finite number.
  - `lng` (optional): finite number.
  - `radius_m` (optional): integer meters, clamped to `[1000, 100000]`, default `20000` when `lat/lng` are present.
  - `limit` (optional): integer, clamped to `[1, 10]`, default `6`.
  - `include_summary` (optional): boolean, default `false`.
- Unknown keys are rejected with `code: "invalid_discovery_payload"`.

### Location Bias Validation
- `lat` and `lng` must be provided together; providing one without the other is invalid payload.
- `radius_m` is ignored unless `lat` and `lng` are both present.

### Canonicalization
- Canonical request object shape:
  - `intent` (trimmed string)
  - `list_id` (`string | null`)
  - `bias` (`{ lat, lng, radius_m } | null`)
  - `limit` (integer)
  - `include_summary` (boolean)

## Deterministic Pipeline Order
1. Authenticate request.
2. Parse and validate request into canonical request.
3. Resolve optional list scope (`list_id`) and validate ownership/readability.
4. Perform deterministic retrieval using server-owned search/filter logic.
5. Apply deterministic ranking and tie-breaking.
6. Optionally generate summary text from the ranked result set (summary cannot mutate ranking).
7. Return canonical response payload.

## Suggestion Lifecycle / Persistence Policy
- `POST /api/discovery/suggest` is strictly read-only:
  - no writes to `place_candidates`,
  - no writes to `enrichments`,
  - no writes to `places`,
  - no writes to `list_items`.
- Persistence begins only when the user explicitly previews a suggestion through Airlock (`/api/places/ingest`).
- Approval continues to promote via `/api/places/promote` with no re-enrichment during promotion.
- Rejection must discard staged preview artifacts when they have not been promoted. Discard deletes only the `place_candidates` row for the current user and unpromoted candidate; enrichments are left intact (Enrich Once, Read Forever).

## Success Response Contract (200)
- Payload shape:
  - `status: "ok"`
  - `canonicalRequest`
  - `canonicalFilters` (`object | null`)
  - `suggestions`
  - `summary` (`object | null`)
  - `meta`

### `suggestions[]` item contract
- `source`: `'google_search' | 'places_index'`
- `source_id`: string (provider identifier, stable within the response)
- `name`: `string | null`
- `address`: `string | null`
- `lat`: `number | null`
- `lng`: `number | null`
- `neighborhood`: `string | null`
- `borough`: `string | null`
- `matched_place_id`: `string | null` (canonical place id if already approved)
- `score`: integer (deterministic ranking score)
- `rank`: integer (1-based rank after deterministic sort)
- `reasons`: `string[]` deterministic reason codes

### Deterministic ordering rules
1. `score` descending.
2. `name` ascending (case-insensitive; nulls last).
3. `source_id` ascending.

### `summary` contract
- `null` when `include_summary=false`.
- When present:
  - `text`: string
  - `model`: string (`"deterministic-fallback"` allowed)
  - `promptVersion`: string
  - `usedFallback`: boolean
- Summary must not include citations, URL lists, or source attribution payloads.
- Summary generation must not alter `suggestions` ordering, filtering, or score values.
- Current implementation uses a deterministic fallback summary builder and keeps ranking/filtering fully isolated from summary generation.

### `meta` contract
- `retrieved_count`: integer
- `returned_count`: integer
- `pipeline_version`: string

## Error Payload Contract
- Standard fields:
  - `code`
  - `message`
  - optional `fieldErrors`
  - optional `lastValidCanonicalRequest`

### Error codes
- `invalid_discovery_payload` (`400`)
- `unauthorized` (`401`)
- `not_found` (`404`) for inaccessible `list_id`
- `discovery_provider_bad_gateway` (`502`)
- `discovery_provider_unavailable` (`503`)
- `internal_error` (`500`)

## Acceptance Checks (Tasks 2.1-2.5)
- Unauthorized requests return `401 unauthorized`.
- Invalid payloads (missing/empty `intent`, unknown keys, invalid bias pairing) return `400 invalid_discovery_payload`.
- Same canonical request yields stable deterministic suggestion ordering.
- `include_summary` toggles summary payload only; ranking and ordering remain unchanged.
- Suggest endpoint performs zero writes to canonical or staging tables.
- Map search flow uses suggest as read-only retrieval:
  - canonical suggestions open existing place details directly,
  - non-canonical suggestions enter preview ingest via Airlock.
- Preview persists via Airlock; approval promotes without re-enrichment.
- Rejection discards preview-created staged artifacts.
- Taxonomy remains enum-safe and exhaustive (`Food | Coffee | Sights | Shop | Activity | Drinks`).

## Discard Endpoint Contract (`POST /api/places/discard`)
- Body: `{ candidate_id: string }` (required). Invalid or missing `candidate_id` returns `400 invalid_discard_payload`.
- Auth: requires authenticated user; unauthenticated returns `401 unauthorized`.
- Behavior: calls RPC `discard_place_candidate(p_candidate_id)` which deletes the matching `place_candidates` row only when `user_id = auth.uid()` and `status <> 'promoted'`. Does not delete enrichments.
- Response: `200` with `{ status: "ok" }` on success. Idempotent: repeat calls for the same or already-deleted candidate return `200`.
- Errors: `500 internal_error` if RPC fails.
