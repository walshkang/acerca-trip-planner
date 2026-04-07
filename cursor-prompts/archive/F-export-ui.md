# Slice F: Export UI + Round-Trip Identifiers

## What to build

Two tasks:
1. A "Download CSV" button in the list/planner UI that triggers the existing export API.
2. Add optional round-trip identifier columns to the CSV export for re-import.

## Task F.1: Export UI Button

### Files to modify

Pick the most natural location — likely one of:
- The list detail panel overflow menu
- The planner shell header/toolbar

### Files to reference

- `app/api/lists/[id]/export/route.ts` — existing server route. Already works. Just needs a client caller.
- `lib/export/contract.ts` — `ExportRequest` type (`{ format: 'csv' }`).
- `DESIGN.md` — design tokens to use.

### Implementation

1. Add a button/menu item labeled "Export CSV" (or similar).
2. On click: `POST /api/lists/{listId}/export` with body `{ "format": "csv" }`.
3. Take the response text and trigger a browser file download:
   ```typescript
   const blob = new Blob([csvText], { type: 'text/csv' })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `${listName}-export.csv`
   a.click()
   URL.revokeObjectURL(url)
   ```
4. Handle 401 (redirect to login) and 400 (show toast/error).
5. Mobile and desktop — should work in both contexts.

## Task F.2: Round-Trip Identifiers

### Files to modify

- `lib/export/contract.ts` — add optional fields to `ExportRow`
- `lib/export/serialize-csv.ts` — add columns to CSV headers and row serialization
- `tests/export/serialize-csv.test.ts` — update tests

### Implementation

1. Add to `ExportRow`:
   ```typescript
   place_id?: string          // internal UUID
   google_place_id?: string   // Google ChIJ... identifier
   ```

2. Add CSV headers `Place ID` and `Google Place ID` (append after `Lng`).

3. In `serializeCsv`, output these fields. They'll be empty strings if not provided (backwards compatible).

4. In `resolve-export-rows.ts`, populate these fields from the places/enrichments data.

5. Update tests to verify the new columns appear.

### Why round-trip IDs matter

When a CSV is re-imported (via the import preview API), rows with a `google_place_id` can skip text search entirely → faster resolution, no ambiguity.

## What NOT to do

- Don't redesign the export format or add new formats.
- Don't change the server export route — it already works.
- Don't add import UI here (that's slice G).
