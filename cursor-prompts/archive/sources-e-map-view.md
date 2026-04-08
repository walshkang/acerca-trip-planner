# Sources E — Show source places on the map

## Goal

When a user selects a social source in `SourcesPanel`, the places from that source should appear on the map in `SourcesShellPaper` (desktop split view). Currently this uses an intersection with `socialPlaces` from the social discovery store, which is filtered/limited and often misses places. Fix by carrying `lat`/`lng` through from the DB directly.

---

## Step 1 — SQL: add `lat` and `lng` to `list_user_social_sources()`

File: `supabase/migrations/20260409000002_list_user_social_sources_v2.sql`

In the `jsonb_build_object(...)` for places, add two fields after `'callouts'`:

```sql
'lat', st_y(p.location::geometry),
'lng', st_x(p.location::geometry)
```

The full place object in the agg should look like:

```sql
jsonb_build_object(
  'place_id', p.id,
  'place_name', p.name,
  'category', p.category,
  'google_place_id', p.google_place_id,
  'google_rating', p.google_rating,
  'google_review_count', p.google_review_count,
  'snippet', sm.snippet,
  'sentiment', sm.sentiment,
  'tags', coalesce(sm.tags, '{}'),
  'callouts', coalesce(sm.callouts, '[]'::jsonb),
  'lat', st_y(p.location::geometry),
  'lng', st_x(p.location::geometry)
)
```

Create a new migration file (don't edit the existing one):

`supabase/migrations/20260411000001_list_user_social_sources_v3.sql`

Content: `create or replace function public.list_user_social_sources()` — copy the full function from the v2 migration and add the two fields. Keep all other SQL identical. Grant line at the bottom stays the same.

---

## Step 2 — TypeScript: add `lat` and `lng` to `UserSocialSourcePlace`

File: `lib/social/user-sources-contract.ts`

```ts
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
  lat: number | null   // ADD
  lng: number | null   // ADD
}
```

---

## Step 3 — Shell: build `sourceMapPlaces` directly from the selected source

File: `components/app/SourcesShellPaper.tsx`

Replace the current `sourceMapPlaces` memo (which filters `socialPlaces` from the store) with one that maps directly from `selectedSource.places`:

```ts
const sourceMapPlaces = useMemo<MapPlace[]>(
  () =>
    (selectedSource?.places ?? [])
      .filter(
        (place) =>
          place.lat != null &&
          place.lng != null &&
          CATEGORY_ENUM_VALUES.includes(place.category as CategoryEnum)
      )
      .map((place) => ({
        id: place.place_id,
        name: place.place_name,
        category: place.category as CategoryEnum,
        lat: place.lat!,
        lng: place.lng!,
        mentionCount: 1,
      })),
  [selectedSource]
)
```

Remove the `socialPlaces` and `fetchSocialPlaces` usage from this file entirely — they're no longer needed in `SourcesShellPaper` (the social discovery store is still used elsewhere: `ExploreShellPaper`). Remove the `hydrateSocialStore` / `fetchSocialPlaces` effect and the `useSocialDiscoveryStore` import if they're only used for `sourceMapPlaces`.

---

## What NOT to change

- `SourcesPanel.tsx` — no changes
- `ResearchTriagePanel.tsx` — no changes  
- Social discovery store (`useSocialDiscoveryStore`) — no changes, still used in Explore mode
- `displayMapPlaces` logic in `SourcesShellPaper` — keep as-is (`researchListId ? researchMapPlaces : sourceMapPlaces`)

---

## Tests

No new tests needed. This is a pure data-wiring fix. Run `npm run check` before committing.
