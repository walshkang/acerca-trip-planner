# Slice H: Verification Gate

## What to build

Unit and API tests for the import/export interchange pipeline. Tests should verify contract compliance, computed field correctness, and end-to-end preview/commit behavior.

## Files to create

- `tests/import/contract.test.ts` — request parsing + validation tests
- `tests/import/compute.test.ts` — pure function unit tests (if not already created in slice C)
- `tests/import/preview-api.test.ts` — API route tests for preview
- `tests/import/commit-api.test.ts` — API route tests for commit

## Files to reference (read these first)

- `lib/import/contract.ts` — `parseImportPreviewRequest`, `parseImportCommitRequest` and all types.
- `lib/import/compute.ts` — all pure functions.
- `docs/PHASE_3_LIST_INTERCHANGE.md` — full contract, error codes, invariants.
- `tests/export/contract.test.ts` — existing test pattern for export validation. **Follow this style.**
- `tests/export/serialize-csv.test.ts` — existing CSV test pattern.
- `docs/PHASE_3_ROUTING_VERIFICATION_GATE.md` — verification gate doc pattern.
- `docs/PHASE_3_DISCOVERY_VERIFICATION_GATE.md` — verification gate doc pattern.

## Test categories

### 1. Contract parsing (`tests/import/contract.test.ts`)

**parseImportPreviewRequest:**
- Valid minimal request (1 row, only place_name) → ok
- Valid full request (all optional fields) → ok
- Missing rows → error
- Empty rows array → error
- 26 rows → row_limit_exceeded
- Unknown top-level key → error
- Row missing place_name → error with field path
- Invalid place_category → error
- Invalid scheduled_date format → error
- Invalid scheduled_slot → error
- item_tags not array → error
- Multiple validation errors returned together

**parseImportCommitRequest:**
- Valid minimal commit → ok
- Missing confirmed_rows → error
- Empty confirmed_rows → error
- Row missing google_place_id → error
- Invalid row_index (negative, float) → error
- Unknown keys → error
- Optional preview_id accepted

### 2. Computed fields (`tests/import/compute.test.ts`)

**haversineDistanceKm:**
- Known pair: Wat Pho (13.7463, 100.4930) to Chatuchak (13.7999, 100.5533) ≈ 8.4 km
- Same point → 0
- Antipodal points → ~20000 km

**parseGoogleOpeningHours:**
- `"Monday: 9:00 AM – 10:00 PM"` → day 1, open 540, close 1320
- `"Sunday: Closed"` → day 0, closed true
- `"Saturday: Open 24 hours"` → day 6, open 0, close 1440
- Empty array → empty result
- Malformed string → skip gracefully

**isOpenDuringSlot:**
- Opens 9 AM–6 PM, morning slot → true
- Opens 9 AM–6 PM, evening slot → false
- Opens 5 PM–11 PM, evening slot → true
- Closed on that day → false
- No hours data → null
- Open 24 hours → true

**computeFieldsForDay:**
- 3 items: verify distances chain (null, A→B, B→C)
- 2 items same slot → slot_conflict true
- Energy sequence: [High, High, High] → all three in sequence
- Unresolved row → distance null, energy excluded

**computeTripSummary:**
- 3-day trip, all slots filled → 0 empty slots
- 3-day trip, day 2 empty → 3 empty slots for that day
- Warnings generated for closed-during-slot, long walks, energy streaks

### 3. Preview API (`tests/import/preview-api.test.ts`)

These may need mocking of Google Places API calls. Use the existing test patterns in the codebase.

- Valid request → 200 with PreviewRow[] and trip_summary
- Unauthenticated → 401
- List not found → 404
- Invalid body → 400 with field errors
- Row with Google Maps URL → resolves correctly
- Row with ambiguous text → status ambiguous with candidates
- Row with nonsense text → status error
- Computed fields present on resolved rows

### 4. Commit API (`tests/import/commit-api.test.ts`)

- Valid commit → 200 with committed rows
- Unauthenticated → 401
- Duplicate place on list → status "updated" not "created"
- Invalid body → 400
- Mix of success and failure rows → partial success response

## Documentation

After tests pass, add a section to `docs/PHASE_3_LIST_INTERCHANGE.md`:

```markdown
## Verification Gate

- Contract parsing: `npm test -- tests/import/contract.test.ts`
- Computed fields: `npm test -- tests/import/compute.test.ts`
- Preview API: `npm test -- tests/import/preview-api.test.ts`
- Commit API: `npm test -- tests/import/commit-api.test.ts`
```

## What NOT to do

- Don't test UI components here (that's manual/Playwright).
- Don't test the export side (already covered in tests/export/).
- Don't mock the database for API tests if the project uses real DB tests (check existing patterns).
