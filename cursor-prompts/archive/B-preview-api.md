# Slice B: Import Preview API

## What to build

A new API route: `POST /api/lists/[id]/import/preview`

This is the core of the headless planning API. It accepts an array of `ImportRow` objects (place names, optional categories/dates/slots), resolves each via Google Places, enriches them, and returns `PreviewRow[]` with resolved data. **No DB writes** — this is read-only.

## Files to create

- `app/api/lists/[id]/import/preview/route.ts`

## Files to reference (read these first)

- `lib/import/contract.ts` — all types, request parser, response shapes. **Use these types directly.**
- `docs/PHASE_3_LIST_INTERCHANGE.md` — full contract specification.
- `app/api/places/ingest/route.ts` — resolution pattern to reuse: `parsePlaceIdFromGoogleMapsUrl`, `findGooglePlaceIdFromText`, `fetchGooglePlace`. **Reuse these functions, do not duplicate them.**
- `lib/enrichment/sources.ts` — `findGooglePlaceIdFromText`, `fetchGooglePlace`, `searchGooglePlaces` live here.
- `app/api/lists/[id]/export/route.ts` — auth + list ownership pattern to follow.
- `lib/routing/contract.ts` — error response pattern to follow.
- `lib/types/enums.ts` — `CategoryEnum`, `EnergyEnum` values.

## Implementation steps

1. **Auth + list ownership**: Follow the pattern in `app/api/lists/[id]/export/route.ts`. Authenticate via Supabase, verify list exists and is readable by user. Return 401/404 with `ImportErrorPayload`.

2. **Parse request**: Call `parseImportPreviewRequest(body)` from `lib/import/contract.ts`. If `ok: false`, return 400 with the error.

3. **Resolve each row** (can be sequential for v1, parallel later):
   - If `place_name` looks like a Google Maps URL → `parsePlaceIdFromGoogleMapsUrl` (extract from ingest route into a shared module if needed, or import directly).
   - If `place_name` starts with `ChI` and length 20–200 → use as direct place_id.
   - Otherwise → `findGooglePlaceIdFromText(place_name)`.
   - If resolution returns multiple candidates → status `ambiguous`, populate `candidates` array.
   - If resolution fails → status `error`, populate `error_message`.
   - If resolved → `fetchGooglePlace(placeId)` for full details.

4. **Build PreviewRow for each input row**:
   - `row_index`: array position (0-based).
   - `status`: `ok` | `ambiguous` | `error`.
   - `input`: echo back the original `ImportRow`.
   - `resolved`: map Google Place details to `ResolvedEnrichment` shape (see contract). For `energy`, use the same heuristic as your existing ingest if available, or default to `Medium`.
   - `computed`: set to `null` for now. Slice C adds these.

5. **Build trip_summary**:
   - `total_days`: count unique `scheduled_date` values across all ok rows.
   - `empty_slots`: if `trip_start_date` and `trip_end_date` provided, enumerate all date+slot combos and find ones with no items. Otherwise empty array.
   - `warnings`: empty array for now. Slice C adds these.

6. **Generate preview_id**: `crypto.randomUUID()` — opaque token for potential cache hit on commit.

7. **Return** `ImportPreviewResponse` as JSON with status 200.

## Error handling

- Google API failures for individual rows → mark that row as `error` with message, don't fail the whole request.
- If ALL rows fail → still return 200 with all error rows. The client (LLM or UI) decides what to do.
- Auth/list errors → return appropriate HTTP status with `ImportErrorPayload`.

## What NOT to do

- Don't write to the database. Preview is read-only.
- Don't implement computed fields (distance, hours check, conflicts). That's slice C.
- Don't create a new enrichment/Wikipedia pipeline call — just use Google Place details for the preview response.
- Don't add UI components.

## Testing (manual)

```bash
curl -X POST http://localhost:3000/api/lists/YOUR_LIST_ID/import/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rows": [
      { "place_name": "Chatuchak Weekend Market", "place_category": "Shop", "scheduled_date": "2026-04-01", "scheduled_slot": "morning" },
      { "place_name": "Wat Pho", "scheduled_slot": "afternoon" }
    ],
    "trip_start_date": "2026-04-01",
    "trip_end_date": "2026-04-03"
  }'
```
