# Slice D: Import Commit API

## What to build

A new API route: `POST /api/lists/[id]/import/commit`

Takes confirmed rows from the preview step and writes them to the database using the existing ingest → enrich → promote pipeline. This is the only write path.

## Files to create

- `app/api/lists/[id]/import/commit/route.ts`

## Files to reference (read these first)

- `lib/import/contract.ts` — `parseImportCommitRequest`, `ImportCommitResponse`, `CommittedRow`, `CommitError` types.
- `docs/PHASE_3_LIST_INTERCHANGE.md` — commit pipeline spec, idempotency rules.
- `app/api/places/ingest/route.ts` — the ingest pipeline: Google fetch → enrichment → store candidate. **Reuse this logic.**
- `app/api/places/promote/route.ts` — `promote_place_candidate` RPC call pattern.
- `app/api/lists/[id]/items/route.ts` — creating list_items, how scheduled_date/slot/tags are set.
- `lib/lists/planner.ts` — `PLANNER_SLOT_SENTINEL_TIME` for converting slot → `scheduled_start_time`, `nextScheduledOrderForSlot` for ordering.
- `app/api/lists/[id]/export/route.ts` — auth + list ownership pattern.

## Implementation steps

1. **Auth + list ownership**: Same pattern as preview route and export route. Verify list exists, user owns it.

2. **Parse request**: Call `parseImportCommitRequest(body)`. If `ok: false`, return 400.

3. **For each confirmed row** (sequential to respect rate limits and ordering):

   a. **Dedupe check**: Query existing places for the user where `source_id` or enrichment contains matching `google_place_id`. If found → use existing `place_id`, skip ingest.

   b. **Ingest if new**: Call the same logic as `POST /api/places/ingest`:
      - `fetchGooglePlace(google_place_id)` for full details.
      - Run Wikipedia/Wikidata enrichment (optional — follow what ingest does).
      - Store as `place_candidate` in DB.
      - Call `promote_place_candidate` RPC with `list_id`.

   c. **Check if already on list**: Query `list_items` where `place_id` matches and `list_id` matches. If exists → update instead of create (set `status: "updated"` in response).

   d. **Create/update list_item**:
      - `scheduled_date`: from confirmed row override, or original preview input.
      - `scheduled_start_time`: convert `scheduled_slot` via `PLANNER_SLOT_SENTINEL_TIME` (morning → "09:00:00", afternoon → "14:00:00", evening → "19:00:00").
      - `scheduled_order`: use `nextScheduledOrderForSlot` for proper DnD ordering.
      - `item_tags`: from confirmed row.
      - Use `PATCH /api/lists/[id]/items/[itemId]` semantics or direct Supabase update.

4. **Collect results**: Build `committed[]` and `errors[]` arrays. A single row failure should not abort the whole batch.

5. **Return** `ImportCommitResponse` as JSON with status 200.

## Idempotency

- If a place with the same `google_place_id` already exists on this list, update the item's schedule/tags instead of creating a duplicate. Return `status: "updated"`.
- If the same `google_place_id` appears twice in `confirmed_rows`, the second one should detect the first and update.

## Error handling

- Individual row failures (e.g. Google API down for that place) → add to `errors[]`, continue processing remaining rows.
- Auth/list errors → return appropriate HTTP status with `ImportErrorPayload`.
- If `preview_id` is provided, you can optionally cache-hit enrichment data from the preview step. For v1, it's fine to re-fetch from Google.

## What NOT to do

- Don't bypass the promote pipeline. All places must go through `promote_place_candidate`.
- Don't skip enrichment. Frozen enrichment is a core invariant.
- Don't create a separate write path — reuse existing ingest/promote functions.
- Don't add UI components.
