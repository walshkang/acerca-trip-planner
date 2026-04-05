# Phase 3 List Interchange — Headless Planning API (P3-E4)

## Goal
- Define a model-agnostic, server-owned import/export contract for trip lists.
- Any LLM client (custom GPT, Gemini Gem, Claude skill, in-app chat) can drive a multi-pass planning loop using structured JSON rows.
- Server owns resolution (Google Places), enrichment (frozen), and deterministic computation (distance, slot-hours, conflicts). LLM clients are replaceable intent-translation layers.

## Non-Goals (v1)
- LLM or client writing directly to DB.
- Skipping enrichment or frozen data pipeline.
- Auto-committing ambiguous text matches without user pick.
- Import as a separate source of truth from places/list_items.
- Real-time transit routing APIs (use haversine + walking estimate).
- In-app chat UI (slice G — later).

## Invariants
- LLMs label and translate intent; deterministic systems retrieve and compute.
- Preview is read-only — no DB mutations until explicit commit.
- Commit reuses existing ingest → enrich → promote pipeline (no parallel write path).
- Server-computed fields are deterministic and reproducible for same inputs.
- Strict taxonomy: LLM-suggested categories must be valid `CategoryEnum` values; server corrects or rejects.
- Contract is model-agnostic: no assumption about which LLM drives the loop.
- User edits never overwrite frozen AI enrichment (EORF).

## Two-Pass Planning Loop

```
Pass 1: Intent → Structure
  User prompt (natural language)
      → LLM generates ImportRow[] (place names, categories, slots, dates)
      → POST /api/lists/[id]/import/preview
      → Server resolves via Google, enriches, computes
      → Returns PreviewRow[] with enrichment + computed fields

Pass 2: Enrichment → Refinement
  LLM receives enriched preview
      → Reasons over real data (hours, distance, ratings, energy)
      → Outputs revised ImportRow[]
      → POST /api/lists/[id]/import/preview (idempotent)
      → User drives N iterations
      → POST /api/lists/[id]/import/commit (confirmed rows only)
```

## Endpoints

### `POST /api/lists/[id]/import/preview`

Read-only. Resolves and enriches rows, returns preview with computed fields. No DB writes.

### `POST /api/lists/[id]/import/commit`

Writes confirmed rows via ingest → enrich → promote_place_candidate → list_item creation.

---

## Request Contract: Import Preview

### Body
- Must be a JSON object.
- Allowed keys:
  - `rows` (required): array of `ImportRow` objects, max 25 for v1.
  - `trip_start_date` (optional): ISO `YYYY-MM-DD`.
  - `trip_end_date` (optional): ISO `YYYY-MM-DD`.
- Unknown keys rejected with `code: "invalid_import_payload"`.

### `ImportRow` Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `place_name` | string | **yes** | Free text, Google Maps URL, or ChIJ place id |
| `place_category` | CategoryEnum | no | `Food \| Coffee \| Sights \| Shop \| Activity \| Drinks`. Server corrects if wrong. |
| `scheduled_date` | string | no | ISO `YYYY-MM-DD` |
| `scheduled_slot` | string | no | `morning \| afternoon \| evening` |
| `item_tags` | string[] | no | Freeform tags |
| `notes` | string | no | User/LLM notes for context |

### Resolution Path (per row)
1. If `place_name` is a Google Maps URL → `parsePlaceIdFromGoogleMapsUrl` → place_id.
2. If `place_name` starts with `ChI` and length 20–200 → direct place_id.
3. Otherwise → `findGooglePlaceIdFromText` (text search).
4. Fetch place details via `fetchGooglePlace(placeId)`.
5. Run enrichment (Wikipedia/Wikidata geosearch, curated extraction).
6. Dedupe: if `google_place_id` matches an existing canonical place for the user, attach to it.

---

## Response Contract: Import Preview

### `ImportPreviewResponse`

```typescript
{
  rows: PreviewRow[]
  trip_summary: {
    total_days: number
    empty_slots: { date: string; slot: PlannerSlot }[]
    warnings: string[]        // global issues
  }
}
```

### `PreviewRow`

| Field | Type | Notes |
|-------|------|-------|
| `row_index` | number | 0-based, matches input array position |
| `status` | `"ok" \| "ambiguous" \| "error"` | |
| `error_message` | string \| null | If status is `error` |
| `candidates` | ResolvedCandidate[] \| null | If status is `ambiguous`, user picks one |
| `input` | object | Echo of original ImportRow fields |
| `resolved` | ResolvedEnrichment \| null | null if unresolved |
| `computed` | ComputedFields \| null | null if unresolved |

### `ResolvedEnrichment`

Frozen enrichment data from Google Places + Wikipedia/Wikidata pipeline.

| Field | Type | Notes |
|-------|------|-------|
| `place_name` | string | Canonical name from Google |
| `google_place_id` | string | Stable identifier |
| `neighborhood` | string \| null | |
| `lat` | number | |
| `lng` | number | |
| `google_rating` | number \| null | 1.0–5.0 |
| `google_price_level` | number \| null | 1–4 |
| `google_review_count` | number \| null | |
| `opening_hours` | string[] \| null | Google format: `["Monday: 9:00 AM – 10:00 PM", ...]` |
| `energy` | EnergyEnum | `Low \| Medium \| High` |
| `category` | CategoryEnum | Confirmed or corrected from input |
| `website` | string \| null | |
| `google_maps_url` | string | |

### `ComputedFields`

All deterministic, server-computed. No LLM involved.

| Field | Type | Notes |
|-------|------|-------|
| `open_during_slot` | boolean \| null | null if no hours data. Checks opening_hours vs scheduled_date + scheduled_slot time range. |
| `distance_from_previous_km` | number \| null | Haversine distance from previous item in same-day sequence. null for first item. |
| `travel_time_minutes` | number \| null | Estimated walking time (distance_km / 5 × 60). null if no previous. |
| `slot_conflict` | boolean | Another item already occupies this date + slot. |
| `energy_sequence` | EnergyEnum[] | Energy levels of consecutive items up to and including this one. Clients can warn on 3+ consecutive High. |

### Slot Time Ranges

Used for `open_during_slot` computation:

| Slot | Start | End | Sentinel Time |
|------|-------|-----|---------------|
| `morning` | 08:00 | 12:00 | 09:00 |
| `afternoon` | 12:00 | 17:00 | 14:00 |
| `evening` | 17:00 | 22:00 | 19:00 |

### `ResolvedCandidate` (for ambiguous rows)

| Field | Type |
|-------|------|
| `google_place_id` | string |
| `place_name` | string |
| `address` | string \| null |
| `google_rating` | number \| null |
| `lat` | number |
| `lng` | number |

---

## Request Contract: Import Commit

### Body
- Must be a JSON object.
- Allowed keys:
  - `confirmed_rows` (required): array of objects.
    - `row_index` (required): number — references preview response.
    - `google_place_id` (required): string — resolved or user-picked from candidates.
    - `scheduled_date` (optional): string — override from preview.
    - `scheduled_slot` (optional): PlannerSlot — override from preview.
    - `item_tags` (optional): string[] — override from preview.
  - `preview_id` (optional): string — opaque token from preview response for cache hit.
- Unknown keys rejected with `code: "invalid_import_commit_payload"`.

### Commit Pipeline (per row)
1. Check if `google_place_id` matches existing canonical place for user → attach.
2. Otherwise: ingest candidate → frozen enrichment → `promote_place_candidate` with `list_id`.
3. Create `list_item` with `scheduled_date`, `scheduled_slot` (via sentinel time), `item_tags`.
4. Apply `scheduled_order` via `nextScheduledOrderForSlot` semantics.

### Idempotency
- If place already exists on list with same `google_place_id`, update schedule/tags instead of duplicate.

---

## Response Contract: Import Commit

```typescript
{
  committed: {
    row_index: number
    place_id: string       // internal UUID
    list_item_id: string
    status: "created" | "updated"  // updated = already existed
  }[]
  errors: {
    row_index: number
    error_message: string
  }[]
}
```

---

## Error Codes

| Code | HTTP | When |
|------|------|------|
| `invalid_import_payload` | 400 | Bad JSON, unknown keys, schema violation |
| `invalid_import_commit_payload` | 400 | Bad commit body |
| `row_limit_exceeded` | 400 | More than 25 rows in v1 |
| `unauthorized` | 401 | Not authenticated |
| `list_not_found` | 404 | List doesn't exist or not readable |
| `date_outside_trip_range` | 400 | scheduled_date outside list's start/end bounds |
| `google_resolution_failed` | 502 | Google Places API error for a row |
| `internal_error` | 500 | Unexpected server error |

---

## TypeScript Types

See `lib/import/contract.ts` for full type definitions including:
- `ImportRow`, `ImportPreviewRequest`, `ImportPreviewResponse`
- `PreviewRow`, `ResolvedEnrichment`, `ComputedFields`
- `ResolvedCandidate`
- `ImportCommitRequest`, `ImportCommitResponse`
- `parseImportPreviewRequest()` — request parser with unknown-key rejection

---

## Verification Gate

Automated coverage for import interchange: contract parsing, pure compute helpers, and preview/commit API routes (mocked Supabase / Google where applicable).

- Contract parsing: `npm test -- tests/import/contract.test.ts`
- Computed fields: `npm test -- tests/import/compute.test.ts`
- Preview API: `npm test -- tests/import/preview-api.test.ts`
- Commit API: `npm test -- tests/import/commit-api.test.ts`

Run `npm run check` before pushing when possible.

---

## LLM Client Contract

Any model can drive this API with just:
1. The `ImportRow` JSON schema (6 fields, 1 required).
2. Valid enum values: `CategoryEnum` = `Food | Coffee | Sights | Shop | Activity | Drinks`. `PlannerSlot` = `morning | afternoon | evening`.
3. Instructions: output JSON rows, read enriched preview, reason over computed warnings, revise, repeat until user is happy.
4. No API keys, DB schemas, or enrichment internals needed.

See `docs/LLM_PLANNING_CLIENT_PROMPT.md` for the portable reference prompt.
