# Phase 3 Discovery Verification Gate (P3-E2 / 2.2, 2.4, 2.5)

## Scope
This gate applies to discovery suggestion-layer behavior for:
- request parsing/canonicalization and auth/list-scope validation,
- deterministic retrieval/filter/ranking semantics,
- optional summary generation constraints,
- map-shell integration behavior for canonical vs preview suggestion handling,
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
2. `npm run test -- tests/discovery/client.test.ts tests/discovery/store.test.ts`
3. `npm run test -- tests/discovery/reject-route.test.ts`
4. `npm run check`

## Unit/API Matrix
| Area | Scenario | Expected |
| --- | --- | --- |
| Auth | unauthenticated suggest request | `401 unauthorized` |
| Request contract | invalid payload / unknown key / invalid bias pairing | `400 invalid_discovery_payload` |
| List scope | inaccessible or missing `list_id` | `404 not_found` |
| Determinism | same canonical request repeated | stable ordering + ranks |
| Summary isolation | `include_summary` toggled | same suggestions/order/score |
| Client adapter | mixed `places_index` and `google_search` suggestions | deterministic row mapping + stable row identifiers |
| Map-shell suggest integration | canonical row click vs non-canonical row click | canonical opens `?place=<id>`; non-canonical goes through preview ingest |
| Persistence boundary | suggest request | zero writes to `place_candidates`, `enrichments`, `places`, `list_items` |
| Preview path | preview a suggestion | staged artifacts created via Airlock only |
| Approve path | approve preview-created candidate | promote succeeds with no re-enrichment |
| Reject path | reject/discard preview-created candidate | discard RPC deletes candidate only; store discardAndClear clears state and calls discard; idempotent |
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
- Client/store integration behavior is covered by automated tests.
- `roadmap.json` and regenerated `CONTEXT.md` are aligned when task statuses change.

## Completed Gate Items (P3-E2 / 2.6-2.7)
- Reject/discard automated tests added: `tests/discovery/reject-route.test.ts`, store tests in `store.test.ts`.
- Preview/approve/reject rows in the matrix above are required; discard path covered by reject-route and store tests.

## Acceptance Checklist
- [ ] Contract errors map to the documented `400/401/404/502/503/500` semantics.
- [ ] Deterministic ordering is stable for repeated identical requests.
- [ ] Summary generation does not change deterministic suggestion results.
- [ ] Suggest results map deterministically into map-shell rows.
- [ ] Canonical suggestions open existing place details; non-canonical suggestions use preview ingest.
- [ ] Suggest endpoint is read-only across canonical and staging tables.
- [x] Preview persists through Airlock only.
- [x] Approval promotes without re-enrichment.
- [x] Reject path discards preview-created staged artifacts (discard route + store discardAndClear; enrichments preserved).
- [ ] Taxonomy remains exhaustive and icon-safe.
