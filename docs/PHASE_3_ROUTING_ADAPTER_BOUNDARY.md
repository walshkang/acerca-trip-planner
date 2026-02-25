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
- Output (Task 1.2):
  - Failure-only contract:
    - `provider_unavailable`
    - `provider_error`

## Failure Semantics
- `provider_unavailable` means provider path is intentionally unavailable for current build/config.
- `provider_error` means provider execution failed unexpectedly (timeout/upstream/adapter failure class).
- Failure payloads are deterministic and include provider kind + retryability flag.

## Route Mapping
| Adapter result | Route response |
| --- | --- |
| `provider_unavailable` | Existing `501` payload with `code: "routing_provider_unavailable"` and `status: "provider_unavailable"` |
| `provider_error` | Existing `500` payload with `code: "internal_error"` |

## Contract Stability Rule
- Task 1.2 does not change `POST /api/lists/[id]/routing/preview` public response shapes.
- Adapter boundary is internal architecture only.

## Follow-ups
- Task 1.3: define successful provider output model (legs with duration/distance semantics).
- Task 1.4: expand verification matrix for provider failure classes and success mapping.
