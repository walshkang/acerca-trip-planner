# Phase 3 Discovery Verification Gate (P3-E2 / 2.2, 2.4)

## Scope
This gate applies to discovery suggestion-layer behavior for:
- request parsing/canonicalization and auth/list-scope validation,
- deterministic retrieval/filter/ranking semantics,
- optional summary generation constraints,
- persistence boundaries for the suggest path (preview/approve/reject cleanup is tracked separately),
- error-code mapping for provider and internal failures.

## Invariants
- Deterministic compute owns retrieval, filters, ranking, and tie-breaking.
- LLM output is optional summary text only and cannot affect ranking.
- Suggest endpoint remains read-only.
- Approval remains the only path to canonical truth.
- Rejection discards staged preview artifacts.
- Strict taxonomy remains enum-safe and exhaustive.

## Required Commands (Implementation Slices)
1. `npm run test -- tests/discovery/contract.test.ts tests/discovery/suggest-route.test.ts tests/discovery/summary.test.ts`
2. `npm run check`

## Unit/API Matrix
| Area | Scenario | Expected |
| --- | --- | --- |
| Auth | unauthenticated suggest request | `401 unauthorized` |
| Request contract | invalid payload / unknown key / invalid bias pairing | `400 invalid_discovery_payload` |
| List scope | inaccessible or missing `list_id` | `404 not_found` |
| Determinism | same canonical request repeated | stable ordering + ranks |
| Summary isolation | `include_summary` toggled | same suggestions/order/score |
| Persistence boundary | suggest request | zero writes to `place_candidates`, `enrichments`, `places`, `list_items` |
| Preview path (future gate) | preview a suggestion | staged artifacts created via Airlock only |
| Approve path (future gate) | approve preview-created candidate | promote succeeds with no re-enrichment |
| Reject path (future gate) | reject preview-created candidate | staged artifacts discarded |
| Taxonomy | category outputs | enum-safe (`Food/Coffee/Sights/Shop/Activity/Drinks`) |
| Provider failures | upstream provider unavailable/error | deterministic `503` or `502` mapping |
| Internal failures | unexpected route exception | `500 internal_error` |

## Pass Criteria
- Required command suite passes.
- Discovery contract docs match implementation behavior:
  - `docs/PHASE_3_DISCOVERY_CONTRACT.md`
  - `docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md`
- Suggest endpoint write-path checks prove read-only behavior.
- Summary isolation behavior is covered by automated tests.
- `roadmap.json` and regenerated `CONTEXT.md` are aligned when task statuses change.

## Deferred Gate Items (P3-E2 / 2.6-2.7)
- Add reject/discard automated tests when cleanup path is implemented.
- Promote preview/approve/reject rows in the matrix above from future gate to required gate.

## Acceptance Checklist
- [ ] Contract errors map to the documented `400/401/404/502/503/500` semantics.
- [ ] Deterministic ordering is stable for repeated identical requests.
- [ ] Summary generation does not change deterministic suggestion results.
- [ ] Suggest endpoint is read-only across canonical and staging tables.
- [ ] Preview persists through Airlock only (required for `P3-E2 / 2.6-2.7`).
- [ ] Approval promotes without re-enrichment (required for `P3-E2 / 2.6-2.7`).
- [ ] Reject path discards preview-created staged artifacts (required for `P3-E2 / 2.6-2.7`).
- [ ] Taxonomy remains exhaustive and icon-safe.
