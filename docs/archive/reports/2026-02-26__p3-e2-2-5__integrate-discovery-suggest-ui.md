# Learning Report: Integrate discovery suggest into map UI (P3-E2 / 2.5)

- Date: 2026-02-26
- Scope: Discovery UI integration for suggest results (map-first flow)
- Author: Walsh Kang

## Summary
- Replaced Omnibox text-search retrieval from `/api/places/search` with `POST /api/discovery/suggest`.
- Preserved persistence boundary: suggest remains read-only; preview ingest (`/api/places/ingest`) is still the first write path for non-canonical suggestions.
- Added canonical-click behavior so existing places open directly in map details via URL-driven state.

## What Changed
- Added client adapter mapping layer for suggest payloads:
  - `lib/discovery/client.ts`
- Updated discovery store:
  - `lib/state/useDiscoveryStore.ts`
  - Added `listScopeId` + `setListScopeId`
  - Switched text search to `/api/discovery/suggest`
  - Kept direct URL/place_id fast path on `/api/places/ingest`
- Updated map shell integration:
  - `components/discovery/Omnibox.tsx`
  - `components/map/MapContainer.tsx`
  - Canonical suggestions open details directly; non-canonical suggestions preview via ingest.
- Added tests:
  - `tests/discovery/client.test.ts`
  - `tests/discovery/store.test.ts`
- Updated status/docs:
  - `roadmap.json` (`P3-E2 / 2.5` → completed)
  - `CONTEXT.md` (regenerated)
  - `docs/PHASE_3_DISCOVERY_CONTRACT.md`
  - `docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md`

## Decisions / Rationale
- Canonical suggestion handling:
  - If a suggestion already resolves to canonical (`places_index` source or `matched_place_id`), open existing place details immediately instead of re-ingesting.
  - This avoids duplicate preview/candidate churn and keeps DB/map truth boundaries intact.
- Suggest request shaping:
  - Automatically include active list scope (`list_id`) and current map bias (`lat/lng/radius_m`) when available.
  - This keeps retrieval deterministic and map-contextual without adding new UI controls.
- Summary behavior:
  - Kept `include_summary=false` in Omnibox flow for this slice to avoid expanding UI scope beyond `2.5`.

## Verification
- `npm run test -- tests/discovery/contract.test.ts tests/discovery/suggest-route.test.ts tests/discovery/summary.test.ts tests/discovery/client.test.ts tests/discovery/store.test.ts`
- `npm run check`
- `npm run context:refresh`

## Next Steps
- Implement `P3-E2 / 2.6` reject/discard cleanup for preview-created staged artifacts.
- Implement `P3-E2 / 2.7` extended invariant automation (including reject/discard checks as required gate items).
