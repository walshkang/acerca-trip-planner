# Sources Redesign — Slice B: API Contract

> **Read first:** `cursor-prompts/agent_task.md` — preamble, invariants, and DoD (including CONTEXT.md update requirement).

## Goal

Extend `GET /api/enrichment/user-sources` to surface the new fields from Slice A:
- `tags: string[]` — auto-tags per place-mention
- `callouts: Callout[]` — dishes/activities extracted per place-mention  
- `google_rating: number | null` — from `places.google_rating`
- `google_review_count: number | null` — from `places.google_review_count`

**Depends on Slice A being applied and `npm run db:types` having been run.**

---

## Files to read first

- `lib/social/user-sources-contract.ts` — TypeScript contract for the API response
- `app/api/enrichment/user-sources/route.ts` — the GET handler
- `supabase/migrations/20260407000001_user_social_sources.sql` — `list_user_social_sources()` function definition
- `lib/social/extraction-contract.ts` — `Callout` type (added in Slice A)

---

## Changes

### 1. New migration: `supabase/migrations/20260409000002_list_user_social_sources_v2.sql`

Replace `list_user_social_sources()` to include the new fields:

```sql
CREATE OR REPLACE FUNCTION public.list_user_social_sources()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'source_id', sub.source_id,
          'created_at', sub.created_at,
          'url', sub.url,
          'platform', sub.platform,
          'title', sub.title,
          'author_name', sub.author_name,
          'author_persona', sub.author_persona,
          'places', sub.places
        )
        ORDER BY sub.created_at DESC
      )
      FROM (
        SELECT
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona,
          COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'place_id', p.id,
                'place_name', p.name,
                'category', p.category,
                'google_place_id', p.google_place_id,
                'google_rating', p.google_rating,
                'google_review_count', p.google_review_count,
                'snippet', sm.snippet,
                'sentiment', sm.sentiment,
                'tags', COALESCE(sm.tags, '{}'),
                'callouts', COALESCE(sm.callouts, '[]'::jsonb)
              )
              ORDER BY sm.created_at
            ),
            '[]'::JSONB
          ) AS places
        FROM user_social_sources uss
        JOIN social_sources ss ON ss.id = uss.source_id
        JOIN social_mentions sm ON sm.source_id = uss.source_id
        JOIN places p ON p.id = sm.place_id
        WHERE uss.user_id = auth.uid()
        GROUP BY
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona
      ) sub
    ),
    '[]'::JSONB
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_user_social_sources() TO authenticated;
```

---

### 2. Update `lib/social/user-sources-contract.ts`

```typescript
import type { Callout } from '@/lib/social/extraction-contract'

export type UserSocialSourcePlace = {
  place_id: string
  place_name: string
  category: string
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  snippet: string
  sentiment: string | null
  tags: string[]
  callouts: Callout[]
}

export type UserSocialSourceRow = {
  source_id: string
  created_at: string
  url: string
  platform: string
  title: string | null
  author_name: string
  author_persona: string
  places: UserSocialSourcePlace[]
}

export type UserSocialSourcesGetResponse = {
  sources: UserSocialSourceRow[]
}
```

---

### 3. Update `app/api/enrichment/user-sources/route.ts`

The route calls `list_user_social_sources()` and returns the result. The Postgres function now returns the new fields, so the TypeScript type change is sufficient. Verify the route does not manually re-shape the `places` array — if it does, add pass-through for the new fields.

No logic change is needed if the route simply forwards the RPC result. If there is a mapping step, add `google_rating`, `google_review_count`, `tags`, and `callouts` to it.

---

### 4. Update tests

- `app/api/enrichment/user-sources/__tests__/route.test.ts` — update the mock RPC response to include `tags`, `callouts`, `google_rating`, `google_review_count` on each place; assert the API response contains them

---

## Definition of Done

- [ ] Migration applies cleanly
- [ ] `GET /api/enrichment/user-sources` response includes `tags`, `callouts`, `google_rating`, `google_review_count` per place
- [ ] TypeScript types match the response shape
- [ ] Route test updated and passing
- [ ] `npm run check` passes
- [ ] `CONTEXT.md` updated: Slice B marked **Done** in the Sources Redesign status table
