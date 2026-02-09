# p2-e2-filter-schema

## Goal
- Define a server-owned, runtime-validated filter JSON contract for planner/discovery reads.
- Keep filter semantics deterministic and aligned with existing taxonomy and planner slots.

## Non-Goals
- No client-side ad hoc filter contract branching.
- No enrichment refresh changes.
- No schema migration in this plan artifact itself.

## Invariants
- DB remains source of truth.
- LLM labels/intent translation only; deterministic retrieval and filtering.
- Strict taxonomy remains exhaustive and deterministic.
- User edits never overwrite frozen AI enrichment.

## Verification
- Validate artifacts: `npm run plan:validate`.
- Implementation phase should add contract tests for parser/validator and route-level behavior.

## Implementation Plan (File-by-File)

### Phase 1: Introduce server-owned filter contract + validation
- `lib/lists/filters.ts`
  - Add contract types for planner filter payload (`categories`, `tags`, `slot`, optional planner date fields).
  - Add deterministic normalization helpers (taxonomy alias normalization, slot canonicalization, stable ordering).
  - Add runtime validator returning field-level errors (not just boolean pass/fail).
- `app/api/lists/[id]/items/route.ts`
  - Parse incoming filter payload from query/body in a single path.
  - Validate against `lib/lists/filters.ts` server schema.
  - Return `400` with:
    - `code: "invalid_filter_payload"`
    - `fieldErrors`
    - `lastValidCanonicalFilters` (if available for this request context)
  - On success, return canonical filters in `200` payload (`canonicalFilters`).

### Phase 2: Move UI to draft/applied filter model
- `components/lists/ListDrawer.tsx`
  - Replace direct toggle filtering model with explicit:
    - `draftFilters`
    - `appliedFilters`
    - `dirty` detection
    - `validation` state
  - Add `Apply` and `Reset to Applied` behavior.
  - Keep previous results rendered while apply request is in flight.
  - Use `canonicalFilters` from server response to resync draft/applied.
  - Keep `onPlaceIdsChange` map refresh bound to applied result set only (pins must not drift).
- `components/lists/ListDetailBody.tsx`
  - Render filter chips as removable controls.
  - Add filter section error surfaces (field-level messaging).
  - Add empty-results state actions (`Remove Date/Slot`, `Clear Tags`, `Clear Categories`).

### Phase 3: Preview count + debounced feedback
- `components/lists/ListDrawer.tsx`
  - Add debounced preview request path for valid drafts.
  - Show preview result count in apply CTA (`Apply (N)`).
  - Disable apply when draft is invalid.
- `app/api/lists/[id]/items/route.ts`
  - Support lightweight preview mode (`count_only=1` or equivalent) using same validator + canonicalization.

### Phase 4: Tests and regression coverage
- `tests/lists/filters.test.ts`
  - Add validator + normalizer unit tests:
    - accepts canonical payload
    - rejects invalid slot/category/tag shape with field errors
    - alias normalization is deterministic
- `tests/lists/planner.test.ts`
  - Add planner slot/date integration assertions for canonicalization boundaries.
- `tests/e2e/list-filters-and-map-link.spec.ts`
  - Assert draft/apply flow updates map only after apply.
  - Assert empty state suggestion actions reduce friction and recover results.
  - Assert invalid payload paths show field-level UI errors without clearing last valid results.

### Phase 5: Verification and rollout
- Run:
  - `npm run plan:validate`
  - `npm test -- tests/lists/filters.test.ts tests/lists/planner.test.ts`
  - `npx playwright test tests/e2e/list-filters-and-map-link.spec.ts`
  - `npm run check`
- Confirm invariants explicitly in PR notes:
  - DB is source of truth.
  - Map pins reflect applied canonical filters only.
  - Deterministic retrieval remains separate from LLM behavior.
