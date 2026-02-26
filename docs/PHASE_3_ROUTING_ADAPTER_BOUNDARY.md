# Phase 3 Routing Adapter Boundary (P3-E1 / 1.2)

## Goal
- Define a server-only, provider-agnostic adapter boundary for routing preview.
- Preserve the existing public preview route response contract while provider integration is pending.

## Non-Goals (Task 1.2)
- No external routing provider calls.
- No travel-time/distance computation.
- No UI or planner rendering changes.
- No schema migrations.

## Server-Only Boundary
- The adapter boundary is implemented in server modules only.
- Client code must not import or execute provider selection/adapter logic.
- Route handlers remain the single entry point for privileged routing compute.

## Provider Selection Contract
- Environment variable: `ROUTING_PROVIDER`.
- Allowed values:
  - `unimplemented`
  - `google_routes`
  - `osrm`
- Selection is normalized by trim/lowercase.
- Unknown/empty/missing values deterministically fall back to `unimplemented`.

## Adapter Interface
- Input:
  - `canonicalRequest`
  - `list`
  - `sequence`
  - `routeableSequence`
  - `legDrafts`
- Output:
  - Success contract:
    - `ok: true`
    - `provider`
    - `legs[]` with `{ index, distance_m, duration_s }`
  - Failure contract:
    - `provider_unavailable`
    - `provider_error`

## Failure Semantics
- `provider_unavailable` means provider path is intentionally unavailable for current build/config.
- `provider_error` means provider execution failed unexpectedly (timeout/upstream/adapter failure class).
- Failure payloads are deterministic and include provider kind + retryability flag.

## Success Semantics (Task 1.3)
- Provider returns metric rows keyed by deterministic leg `index`.
- Provider cannot reorder legs or redefine itinerary adjacency.
- Provider metrics are transport values only; route handler merges them onto deterministic `legDrafts`.

## Route-Side Validation of Success Payload
- Route validates provider success payload before emitting `status: "ok"`:
  - `legs.length` must equal `legDrafts.length`.
  - `index` values must be unique integers and sequentially cover `[0, N-1]`.
  - `distance_m` and `duration_s` must be finite and non-negative.
- Route normalizes metric values with integer rounding (`Math.round`) and clamp to zero.
- Validation failures are logged structurally and mapped to `500 internal_error` (contract stability from Task 1.2).

## Route Mapping
| Adapter result | Route response |
| --- | --- |
| `ok: true` + valid metrics | `200` payload with `status: "ok"` and computed leg metrics/badges |
| `provider_unavailable` | Existing `501` payload with `code: "routing_provider_unavailable"` and `status: "provider_unavailable"` |
| `provider_error` | Existing `500` payload with `code: "internal_error"` |

## Contract Stability Rule
- Task 1.3 adds a success mode but preserves Task 1.2 failure mapping and codes.
- Adapter boundary is internal architecture only.

## Follow-ups
- Task 1.4: expand verification matrix for provider failure classes and success mapping.
- Task 1.4+: evaluate `500` vs `502` for invalid upstream payload semantics.
