# Sources Research Workspace S10 — "Add to Trip" Mutation

## Prerequisite

S7 (schema) and S8 (RPC) must be applied. S9 can run in parallel — this slice does not depend on voting UI.

## What to build

The golden path for moving a researched place into a real trip:

1. "Add to Trip" button on each research workspace place card
2. A sheet/modal listing the user's available `trip` lists
3. A server mutation that creates a `list_items` record in the target list, carrying forward social mention context in `notes`

## Files to read first

- `CONTEXT.md`, `AGENTS.md`, `docs/VIBE_PLAYBOOK.md`, `DESIGN.md`
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 10 spec
- `components/stitch/README.md` — component library reference
- `app/api/lists/[id]/items/` — existing `list_items` creation route; reuse it rather than building a new one
- `lib/supabase/types.ts` — verify `lists`, `list_items`, `list_type` are present

## Scope

### 1. "Add to Trip" button

Each place card in the research workspace panel renders an "Add to Trip" button (secondary action, below the +/- vote controls). Clicking it opens the trip-picker sheet.

### 2. Trip-picker sheet

A bottom sheet (mobile) / popover (desktop) listing the user's `trip` lists:

```
Add to Trip
─────────────────────────
○ Tokyo May 2026
○ Kyoto Weekend
○ + New trip list
─────────────────────────
[Cancel]  [Add]
```

- Fetch `lists` where `list_type = 'trip'` and `user_id = auth.uid()` — use the existing Supabase client (no new API route needed for the read)
- "New trip list" option: create a new list inline (name only, no extra config), then immediately select it
- Selecting a list and clicking "Add" triggers the mutation

### 3. Server mutation

Reuse `POST /api/lists/[id]/items` to create the `list_items` row. No new API route needed unless the existing route cannot handle the provenance note — check before creating a new one.

**Provenance note:** Populate `list_items.notes` with the top social mention context from the place:

```
From [author_name] on [platform]: "[snippet]"
```

If there are multiple snippets, use the highest-overlap source's snippet. Keep the note under 280 characters.

**Idempotency:** If the place is already in the target list (same `place_id` and `list_id` in `list_items`), show a toast "Already in [list name]" and close the sheet without creating a duplicate.

### 4. Success feedback

On success:
- Close the sheet
- Show a brief toast: "Added to [list name]"
- The "Add to Trip" button on that card changes to a checkmark/disabled state for the remainder of the session (no persistent DB state needed — local UI flag is fine)

## What NOT to do

- Don't build a new API route if `POST /api/lists/[id]/items` already handles the shape — read the route first
- Don't create a `list_items` record for research-type lists — only `trip` lists are valid destinations
- Don't copy or move the `social_mentions` rows — provenance lives in the note string only
- Don't add real-time sync for the added state — a session-local flag is sufficient for MVP

## Verification

1. Open a research workspace with at least one resolved place
2. Click "Add to Trip" → sheet opens with user's trip lists
3. Select a list → `list_items` row created in DB with provenance note
4. Re-click "Add to Trip" on same place → toast "Already in [list name]", no duplicate row
5. Navigate to the target trip list → the place appears as a normal list item with the note
6. `npm test` passes; no regression on existing list/item API tests

## Update CONTEXT.md

Mark S10 as **Done** in the Sources Research Workspace slice table. If all of S7–S10 are done, update "Current Phase" and move the block to "Completed Phases".
