# Phase 3 Routing Verification Gate (P3-E1 / 1.4)

## Scope
This gate applies to deterministic routing contract behavior for:
- request parsing and bounds validation,
- deterministic sequencing and leg drafting,
- provider-success metric validation/normalization,
- provider-boundary status/code mapping.

## Invariants
- Deterministic systems compute ordering and mapping.
- List scheduling data is source of truth for route sequence.
- Provider cannot reorder itinerary legs.
- Route handler remains server-only boundary.

## Required Commands
1. `npm run test -- tests/routing/provider-leg-metrics.test.ts tests/routing/provider.test.ts tests/routing/contract.test.ts tests/routing/list-routing-preview-route.test.ts`
2. `npm run check`

## Unit/API Matrix
| Area | Scenario | Expected |
| --- | --- | --- |
| Request contract | invalid payload / missing date / unknown key | `400 invalid_routing_payload` |
| Trip bounds | date outside start/end bounds | `400 date_outside_trip_range` |
| Auth/list access | unauthenticated / list not found | `401 unauthorized`, `404 not_found` |
| Sequence determinism | mixed slot/category/order/ties | stable deterministic order |
| Routeability | missing coordinates | unroutable item classification + summary counts |
| Success mapping | valid provider leg metrics | `200 status:"ok"`, computed legs + non-null totals |
| Metric normalization | float distance/duration | integer normalized metrics |
| Badge derivation | `duration_s=0` and sub-minute duration | `0m/0 min` and minimum `1m` for non-zero |
| Validation failure | count mismatch / invalid index / non-finite / negative | `502 routing_provider_bad_gateway` |
| Provider failure | `provider_error` | `502 routing_provider_bad_gateway` |
| Provider unavailable | `provider_unavailable` | `501 routing_provider_unavailable` |
| Internal failures | DB/read errors or thrown exceptions | `500 internal_error` |

## Pass Criteria
- All required command suites pass.
- Contract docs (`PHASE_3_ROUTING_CONTRACT.md`, `PHASE_3_ROUTING_ADAPTER_BOUNDARY.md`) match implementation semantics.
- `roadmap.json` + regenerated `CONTEXT.md` reflect final task status.

## Acceptance Checklist
- [ ] Valid provider success returns deterministic legs with merged metrics and badges.
- [ ] Provider-boundary failures use `502 routing_provider_bad_gateway`.
- [ ] Provider unavailable remains `501 routing_provider_unavailable`.
- [ ] Non-provider internal failures remain `500 internal_error`.
- [ ] No UI, schema, or taxonomy behavior changed in this slice.
