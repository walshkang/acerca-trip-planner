# Sources Redesign — Slice A: Schema + Extraction Pipeline

## Goal

Extend the social ingestion pipeline to extract and persist:
1. **Auto-tags** — 1–4 keyword labels derived from how a place is described (e.g. "rooftop", "authentic", "cash only")
2. **Callouts** — specific dishes, drinks, or activities named in the transcript (e.g. "pad see ew", "rooftop pool", "tuk-tuk tour")
3. **Google ratings** — `rating` and `user_ratings_total` from the Google Places search result, stored on the `places` row at ingest time

These fields power the richer place cards in the Sources UI (Slice C).

---

## Files to read first

- `lib/social/extraction-contract.ts` — Zod schemas for Gemini output
- `lib/server/social/ingest.ts` — full ingestion pipeline
- `lib/enrichment/sources.ts` — `searchGooglePlaces` return type (confirm `rating`, `user_ratings_total` fields)
- `supabase/migrations/20260406000001_create_social_discovery_schema.sql` — existing `social_mentions` schema
- `supabase/migrations/20260408000001_social_ingest_jobs.sql` — most recent migration (for timestamp reference)

---

## Changes

### 1. New migration: `supabase/migrations/20260409000001_social_mentions_tags_callouts_place_ratings.sql`

```sql
-- Add tags and callouts to social_mentions
ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS callouts JSONB NOT NULL DEFAULT '[]';

-- Add Google rating fields to places
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS google_rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Index for filtering/sorting by rating
CREATE INDEX IF NOT EXISTS places_google_rating_idx ON public.places (google_rating);
```

Run `npm run db:types` after applying. Do not proceed to code changes until types regenerate.

---

### 2. Update `lib/social/extraction-contract.ts`

Add `tags` and `callouts` to `mentionedPlaceSchema`:

```typescript
export const calloutSchema = z
  .object({
    type: z.enum(['dish', 'drink', 'activity', 'tip']),
    text: z.string().min(1).max(200),
  })
  .strict()

export type Callout = z.infer<typeof calloutSchema>

export const mentionedPlaceSchema = z
  .object({
    place_name: z.string().min(1),
    place_type: z.string().optional(),
    context_snippet: z.string().min(1).max(4000),
    sentiment: z.enum(['positive', 'neutral', 'mixed']),
    tags: z.array(z.string().min(1).max(50)).max(6).optional().default([]),
    callouts: z.array(calloutSchema).max(10).optional().default([]),
  })
  .strict()
```

Export `Callout` and `calloutSchema`.

---

### 3. Update `lib/server/social/ingest.ts`

#### 3a. Update `SYSTEM_PROMPT` and `CHUNK_SYSTEM_PROMPT`

Append to each prompt (before `.trim()`):

```
For each place also provide:
- tags: 1–4 short keyword labels capturing vibe, format, or notable attributes (e.g. "rooftop", "cash-only", "hidden gem", "outdoor seating"). Max 6 tags.
- callouts: specific named dishes, drinks, or activities mentioned in the context for this place (e.g. {type: "dish", text: "pad see ew"}, {type: "activity", text: "longtail boat ride"}). Only include callouts explicitly named in the transcript. Max 10 callouts per place.
```

#### 3b. Update `ExtractedMention` type

Add `tags` and `callouts`:

```typescript
type ExtractedMention = {
  place_name: string
  place_type?: string
  context_snippet: string
  sentiment: 'positive' | 'neutral' | 'mixed'
  tags?: string[]
  callouts?: Array<{ type: 'dish' | 'drink' | 'activity' | 'tip'; text: string }>
}
```

#### 3c. Update `ensurePlaceId` signature to accept `googleRating` and `googleReviewCount`

```typescript
async function ensurePlaceId(params: {
  sourceUserId: string
  googlePlaceId: string
  name: string
  lat: number
  lng: number
  googleTypes?: string[]
  googleRating?: number
  googleReviewCount?: number
}): Promise<string>
```

In the upsert inside `ensurePlaceId`, add:
```typescript
google_rating: typeof googleRating === 'number' ? googleRating : null,
google_review_count: typeof googleReviewCount === 'number' ? googleReviewCount : null,
```

#### 3d. Pass rating from Google Places result in the resolution loop

In `persistSocialIngest`, where `ensurePlaceId` is called:

```typescript
const placeId = await ensurePlaceId({
  sourceUserId,
  googlePlaceId,
  name: top.name?.trim() || mention.place_name,
  lat,
  lng,
  googleTypes: Array.isArray(top.types) ? (top.types as string[]) : undefined,
  googleRating: typeof top.rating === 'number' ? top.rating : undefined,
  googleReviewCount: typeof top.user_ratings_total === 'number' ? top.user_ratings_total : undefined,
})
```

#### 3e. Include `tags` and `callouts` in the `social_mentions` upsert

```typescript
const mentionInsert = await supabase.from('social_mentions').upsert(
  {
    source_id: sourceId,
    place_id: placeId,
    snippet: mention.context_snippet,
    sentiment: mention.sentiment,
    tags: mention.tags ?? [],
    callouts: mention.callouts ? JSON.parse(JSON.stringify(mention.callouts)) : [],
  },
  { onConflict: 'source_id,place_id' }
)
```

---

## Tests to update / add

- `app/api/enrichment/ingest-social/__tests__/integration.test.ts` — add `tags` and `callouts` to the mock LLM extraction response; assert they are present in the `social_mentions` upsert args
- Add a unit test in `tests/social/` that verifies `mentionedPlaceSchema` accepts and defaults `tags`/`callouts` correctly

---

## Definition of Done

- [ ] Migration applies cleanly (`supabase db push` or `supabase migration up`)
- [ ] `npm run db:types` regenerates without error
- [ ] `mentionedPlaceSchema` validates `tags` and `callouts` (with defaults)
- [ ] `persistSocialIngest` writes `tags`, `callouts`, `google_rating`, `google_review_count` to DB
- [ ] Integration test passes with new fields in mock
- [ ] `npm run check` passes (no lint/type errors)
