# Social Discovery S3.2 — TypeScript RPC Wrapper

## What to build

A typed wrapper around the `discover_social_places` Supabase RPC. This is the client-side function that S4 (map UI) calls to fetch social places.

## Files to create

- `lib/social/queries.ts` — typed RPC call + return types

## Files to reference (read these first)

- `lib/social/extraction-contract.ts` — `PERSONA_VALUES` and `Persona` type (created in S2.1)
- `lib/supabase/types.ts` — generated DB types. After S3.1 migration + `npm run db:types`, the RPC will appear here.
- `lib/supabase/client.ts` — `getSupabase()` browser client
- `components/map/MapView.types.ts` — `MapPlace` type for reference on lat/lng patterns

## Implementation

```typescript
import { getSupabase } from '@/lib/supabase/client'
import type { Persona } from '@/lib/social/extraction-contract'

export type SocialPlace = {
  place_id: string
  name: string
  category: string
  lat: number
  lng: number
  mention_count: number
  personas: Persona[]
  top_snippets: Array<{
    author_name: string
    snippet: string
    platform: string
    sentiment: string
  }>
}

export type SocialPlaceQuery = {
  persona?: Persona | null
  minMentions?: number
  bounds?: { west: number; south: number; east: number; north: number } | null
}

export async function fetchSocialPlaces(
  query: SocialPlaceQuery = {}
): Promise<{ data: SocialPlace[]; error: string | null }> {
  const supabase = getSupabase()

  const params: Record<string, unknown> = {}
  if (query.persona) params.p_persona = query.persona
  if (query.minMentions && query.minMentions > 1) params.p_min_mentions = query.minMentions
  if (query.bounds) {
    // ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid) — pass as WKT for RPC
    params.p_bounds = `SRID=4326;POLYGON((${query.bounds.west} ${query.bounds.south},${query.bounds.east} ${query.bounds.south},${query.bounds.east} ${query.bounds.north},${query.bounds.west} ${query.bounds.north},${query.bounds.west} ${query.bounds.south}))`
  }

  const { data, error } = await supabase.rpc('discover_social_places', params)

  if (error) {
    return { data: [], error: error.message }
  }

  return {
    data: (data ?? []) as SocialPlace[],
    error: null,
  }
}
```

**Note on bounds:** PostGIS geometry params via Supabase RPC can accept EWKT strings. If this doesn't work, fall back to omitting `p_bounds` and filtering client-side. Test empirically.

## What NOT to do

- Don't add any UI code or Zustand store — that's S4
- Don't import server-only modules — this runs in the browser
- Don't add caching logic — keep it simple for v1

## Verification

After S3.1 migration is applied and `npm run db:types` is run, verify the function compiles with `npx tsc --noEmit`. No runtime test needed until seed data exists (S3.3).
