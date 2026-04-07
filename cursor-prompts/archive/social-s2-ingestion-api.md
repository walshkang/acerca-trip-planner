# Social Discovery S2.2 — Ingestion API Route

## What to build

A server-only API route that accepts a social media transcript + metadata, calls an LLM for structured extraction (persona + mentioned places), resolves each place via Google Places API, and upserts everything into Supabase.

**Auth:** Service-role only. Protected by checking a secret header (`X-Ingest-Key` matching `SOCIAL_INGEST_KEY` env var). No user auth — this is a backend pipeline.

## Files to modify

- `app/api/enrichment/ingest-social/route.ts` — **already exists** (extraction-only); refactor to use the full request contract and call the ingest orchestrator
- `lib/server/social/ingest.ts` — create: core orchestration logic (testable without HTTP layer)

## Files to modify

- `.env.example` — add `SOCIAL_INGEST_KEY` and `SOCIAL_SYSTEM_USER_ID`

## Files to reference (read these first)

- `lib/social/extraction-contract.ts` — Zod schemas for request + LLM output (created in S2.1)
- `lib/enrichment/sources.ts` — `searchGooglePlaces()` function (line ~120+). Reuse this for place resolution.
- `lib/supabase/admin.ts` — `getAdminSupabase()` service-role client
- `app/api/enrichment/route.ts` — existing enrichment endpoint pattern (auth check, candidate fetch, upsert)
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 2 spec
- `supabase/migrations/` — the latest social migration (for table names and column types)

> **Context:** The existing route uses `generateObject` from the `ai` SDK with Google Gemini (`gemini-1.5-flash`) and accepts only `{transcript}`. This refactor expands the request contract to the full `IngestSocialRequest` shape and delegates orchestration to `lib/server/social/ingest.ts`. Keep `generateObject` from the `ai` SDK — do not switch to raw Anthropic fetch.

## Implementation

### 1. Route handler: `app/api/enrichment/ingest-social/route.ts`

Replace the existing extraction-only handler with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseIngestSocialRequest } from '@/lib/social/extraction-contract'
import { ingestSocialSource } from '@/lib/server/social/ingest'

export async function POST(request: NextRequest) {
  // Auth: check ingest key
  const ingestKey = process.env.SOCIAL_INGEST_KEY
  if (!ingestKey || request.headers.get('X-Ingest-Key') !== ingestKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = parseIngestSocialRequest(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  const result = await ingestSocialSource(parsed.data)
  return NextResponse.json(result, { status: result.error ? 500 : 200 })
}
```

The request now requires `url`, `platform`, `author_name`, and `transcript` (the fields needed to write `social_sources`). The old extraction-only route only accepted `{transcript}` — this is a breaking change to the request contract.

### 2. Core logic: `lib/server/social/ingest.ts`

This is the orchestrator. The flow:

```
parse request
  → call LLM (structured output) → parse extraction
  → for each mentioned_place:
      → searchGooglePlaces(place_name, location_hint)
      → take top result → build places row
  → upsert social_sources
  → upsert places (ON CONFLICT do nothing)
  → insert social_mentions (ON CONFLICT do nothing)
  → return summary
```

**LLM call:** Use `generateObject` from the `ai` SDK with Google Gemini (already in the project). The existing route uses `createGoogleGenerativeAI` from `@ai-sdk/google` with `gemini-1.5-flash` — keep this. The system prompt should instruct:

```
You are analyzing a transcript from social media content about travel.
Extract the author's persona and all specific places mentioned.
For each place, include the exact quote/context and classify sentiment.
Only include real, specific establishments — not generic references like "a café" or "the beach".
Persona values must be exactly one of: local, luxury, budget, design, foodie, adventure, family, nightlife.
```

Pass `socialExtractionSchema` (from S2.1) as the `schema` argument to `generateObject`. Temperature = 0.

Note: The existing route used a different inline schema with human-readable persona labels ("Local Purist", "Luxury Traveler"). Replace it with `socialExtractionSchema` which uses lowercase values matching the DB enum.

**Google Places resolution:**

```typescript
import { searchGooglePlaces } from '@/lib/enrichment/sources'

for (const mention of extraction.mentioned_places) {
  const searchQuery = mention.place_type
    ? `${mention.place_name} ${mention.place_type}`
    : mention.place_name

  const results = await searchGooglePlaces(searchQuery, {
    lat: request.location_hint?.lat,
    lng: request.location_hint?.lng,
    radiusMeters: 50000, // city-level bias
  })

  if (!results.length) {
    failures.push({ place_name: mention.place_name, reason: 'no_google_match' })
    continue
  }

  const top = results[0]
  // Build place + mention records from top result...
}
```

**Supabase upserts (use admin client):**

1. Upsert `social_sources`:
   ```sql
   INSERT INTO social_sources (url, platform, author_name, author_persona, title, raw_transcript)
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (url) DO UPDATE SET author_persona = EXCLUDED.author_persona
   RETURNING id
   ```

2. Upsert `places` for each resolved place:
   - `user_id` = `process.env.SOCIAL_SYSTEM_USER_ID`
   - `source` = `'social'`
   - `source_id` = `'google:' + googlePlaceId`
   - `name`, `category` (infer from Google types using existing `inferCategory` if available, else default to `'Sights'`)
   - `location` = `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
   - ON CONFLICT (user_id, source, source_id) DO NOTHING — place already known

3. Insert `social_mentions`:
   ```sql
   INSERT INTO social_mentions (source_id, place_id, snippet, sentiment)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (source_id, place_id) DO NOTHING
   ```

**Return shape:**
```typescript
{
  source_id: string
  places_resolved: number
  places_failed: number
  failures: Array<{ place_name: string; reason: string }>
  error?: string
}
```

**Partial success:** If 8/10 places resolve, store those 8. Return the 2 failures in the response for debugging.

### 3. Update `.env.example`

Add:
```
# Social Discovery Pipeline
SOCIAL_INGEST_KEY=          # Secret key for ingestion API auth
SOCIAL_SYSTEM_USER_ID=      # Fixed UUID for system-owned social places
```

## What NOT to do

- Don't use user auth (supabase.auth.getUser) — this is service-role only
- Don't create a new Google Places search function — reuse `searchGooglePlaces` from `lib/enrichment/sources.ts`
- Don't add rate limiting in this slice — that's a future concern
- Don't add UI or client-side code
- Don't switch LLM providers — keep `generateObject` from the `ai` SDK with Google Gemini as already used in the existing route.
- Don't retry failed Google Places lookups — log and move on

## Verification

Write tests in `app/api/enrichment/ingest-social/__tests__/integration.test.ts`:

1. Mock `generateObject` from `ai` to return a valid `SocialExtraction` with lowercase persona (`'foodie'`) and at least one place
2. Mock `global.fetch` to intercept `https://places.googleapis.com/v1/places:searchText` returning a fake place with `id` and `location`
3. Mock `@/lib/supabase/admin` so `getAdminSupabase()` returns a chainable spy object
4. Send POST with the **full request body**: `{url, platform, author_name, transcript, location_hint}` and the `X-Ingest-Key` header
5. Verify: 200 response with `source_id`, `places_resolved`, `places_failed`, `failures`
6. Verify: `social_sources` upsert called with correct `url`, `platform`, `author_persona: 'foodie'`
7. Verify: `places` upsert called with `source = 'social'` and geography point `SRID=4326;POINT(lng lat)`
8. Verify: `social_mentions` insert called with `source_id` → `place_id` linkage
9. Verify: partial failure — if one place gets no Google result, others still insert

Run `npm test` to confirm all tests pass (including the existing extraction tests).
