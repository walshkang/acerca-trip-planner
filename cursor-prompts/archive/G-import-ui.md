# Slice G: Import UI (Upload / Paste → Preview → Confirm)

## What to build

A wizard/modal flow for importing places into a list. Two-step UX: upload/paste → preview table → confirm.

**Note:** The in-app chat (task 4.11) is deferred until the LLM client prompt (slice E) is written and the preview/commit APIs are proven. This prompt covers only the file/paste import UI (task 4.10).

## Files to create

- `components/import/ImportWizard.tsx` — main wizard component (modal or full-screen)
- `components/import/ImportPreviewTable.tsx` — preview table with row statuses, enrichment data, warnings
- `components/import/ImportAmbiguousPicker.tsx` — inline picker for ambiguous rows (choose from candidates)
- `lib/import/client.ts` — client-side API helpers (fetch wrappers for preview + commit)

## Files to reference (read these first)

- `lib/import/contract.ts` — all types. Use `ImportPreviewResponse`, `PreviewRow`, `ComputedFields`, etc.
- `docs/PHASE_3_LIST_INTERCHANGE.md` — full contract, especially PreviewRow and ComputedFields shapes.
- `DESIGN.md` — design tokens, colors, typography.
- `docs/SIGNAL_VISUAL_LANGUAGE.md` — icon system.
- `docs/UX_RULES.md` — UX principles.
- Existing modal/dialog patterns in the codebase for consistent look.

## UX Flow

### Step 1: Input
- Modal with two input modes:
  - **File upload**: drag-and-drop or file picker for `.csv` or `.json` files.
  - **Paste**: textarea for pasting CSV or JSON directly.
- Parse client-side: CSV → extract rows into `ImportRow[]`. JSON → validate shape.
- For CSV parsing: map column headers to ImportRow fields using the interchange contract column names (Name → place_name, Category → place_category, Day → scheduled_date, Slot → scheduled_slot, etc.). Be lenient — unknown columns are ignored, missing optional columns are fine.
- "Preview" button sends to `POST /api/lists/{listId}/import/preview`.

### Step 2: Preview Table
- Render each `PreviewRow` as a table row.
- Columns: Status icon, Place Name (input → resolved), Category, Date, Slot, Neighborhood, Rating, Warnings.
- **Row status styling**:
  - `ok` → green check, show resolved data.
  - `ambiguous` → yellow warning, show `ImportAmbiguousPicker` inline (dropdown/radio of candidates with name + address + rating).
  - `error` → red X, show error_message, row is not selectable for commit.
- **Computed field warnings** (inline per row):
  - `open_during_slot === false` → "May be closed during this slot"
  - `travel_time_minutes > 20` → "~25 min walk from previous stop"
  - `slot_conflict === true` → "Conflicts with another item in this slot"
  - `energy_sequence` has 3+ consecutive "High" → "3 high-energy stops in a row"
- **Trip summary** panel (above or below table):
  - Total days, empty slots listed, global warnings.
- Checkboxes for selecting which rows to commit (all ok rows checked by default, error rows disabled).
- "Confirm Import" button.

### Step 3: Confirm
- Collect selected rows → build `ImportCommitRequest` with `confirmed_rows`.
- For ambiguous rows where user picked a candidate → use that candidate's `google_place_id`.
- Send to `POST /api/lists/{listId}/import/commit`.
- Show result: "X places added, Y updated, Z errors".
- On success → close modal, refresh list/planner state (invalidate relevant queries or refetch).

## Client API helpers (`lib/import/client.ts`)

```typescript
export async function importPreview(listId: string, body: ImportPreviewRequest): Promise<ImportPreviewResponse>
export async function importCommit(listId: string, body: ImportCommitRequest): Promise<ImportCommitResponse>
```

Handle auth headers, error responses, typing.

## Responsive

- Desktop: modal dialog, table with all columns visible.
- Mobile: full-screen sheet, table scrolls horizontally or collapses to card layout per row.

## What NOT to do

- Don't build the in-app chat UI (that's task 4.11, after slice E).
- Don't implement server-side logic — the APIs already exist from slices B-D.
- Don't add export functionality (that's slice F).
