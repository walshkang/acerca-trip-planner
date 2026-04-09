# N5a — Enriched source place cards

## Goal

Source place cards in `SourcesPanel` should show the same data quality as `InspectorCard` / search preview: address, opening hours, and a directions link. Currently they show name, category chip, rating, snippet, tags, and callouts — but lack address, hours, and directions.

**Model: Sonnet** — data plumbing through an existing RPC + UI additions to an existing card component.

---

## Step 1: Extend the RPC

### New migration: `supabase/migrations/20260413000001_list_user_social_sources_v4.sql`

Add `address` and `opening_hours` to the `jsonb_build_object` in `list_user_social_sources()`. These columns already exist on the `places` table.

```sql
create or replace function public.list_user_social_sources ()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'source_id', sub.source_id,
          'created_at', sub.created_at,
          'url', sub.url,
          'platform', sub.platform,
          'title', sub.title,
          'author_name', sub.author_name,
          'author_persona', sub.author_persona,
          'places', sub.places
        )
        order by sub.created_at desc
      )
      from (
        select
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'place_id', p.id,
                'place_name', p.name,
                'category', p.category,
                'google_place_id', p.google_place_id,
                'google_rating', p.google_rating,
                'google_review_count', p.google_review_count,
                'address', p.address,
                'opening_hours', p.opening_hours,
                'snippet', sm.snippet,
                'sentiment', sm.sentiment,
                'tags', coalesce(sm.tags, '{}'),
                'callouts', coalesce(sm.callouts, '[]'::jsonb),
                'lat', st_y(p.location::geometry),
                'lng', st_x(p.location::geometry)
              )
              order by sm.created_at
            ),
            '[]'::jsonb
          ) as places
        from user_social_sources uss
        join social_sources ss on ss.id = uss.source_id
        join social_mentions sm on sm.source_id = uss.source_id
        join places p on p.id = sm.place_id
        where uss.user_id = auth.uid()
        group by
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona
      ) sub
    ),
    '[]'::jsonb
  );
$$;
```

Then run `npm run db:types` to regenerate types.

---

## Step 2: Update the TypeScript contract

### `lib/social/user-sources-contract.ts`

Add to `UserSocialSourcePlace`:

```ts
export type UserSocialSourcePlace = {
  place_id: string
  place_name: string
  category: string
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  address: string | null          // ADD
  opening_hours: unknown | null   // ADD — same shape as places.opening_hours
  snippet: string
  sentiment: string | null
  tags: string[]
  callouts: Callout[]
  lat: number | null
  lng: number | null
}
```

---

## Step 3: Render in SourcePlaceCard

### `components/stitch/SourcesPanel.tsx` — `SourcePlaceCard` component (line 27)

#### 3a. Address — below the name (after line 98)

```tsx
{place.address ? (
  <p className="mt-0.5 truncate text-xs text-paper-on-surface-variant">
    {place.address}
  </p>
) : null}
```

#### 3b. Opening hours — below rating, collapsed by default

Add local state to SourcePlaceCard:

```ts
const [showHours, setShowHours] = useState(false)
```

Parse hours using the same helper pattern as `PlaceDrawer` (line 125–131):

```ts
function weekdayTextFromOpeningHours(v: unknown): string[] | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const oh = v as { weekday_text?: unknown }
  const wt = oh.weekday_text
  if (!Array.isArray(wt) || wt.some((x: unknown) => typeof x !== 'string')) return null
  return wt as string[]
}
```

Move this helper to module scope (it already exists in `PlaceDrawer.tsx` — consider extracting to a shared util, or just duplicate it here for now).

Render after the category/rating row:

```tsx
{weekdayText ? (
  <div className="mt-1">
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setShowHours(h => !h) }}
      className="text-[11px] text-paper-on-surface-variant underline"
    >
      {showHours ? 'Hide hours' : 'Hours'}
    </button>
    {showHours ? (
      <ul className="mt-1 space-y-0.5 text-[11px] text-paper-on-surface-variant">
        {weekdayText.map((line) => <li key={line}>{line}</li>)}
      </ul>
    ) : null}
  </div>
) : null}
```

#### 3c. Directions link — in the button row (line 137, alongside "More details" and "Add to list")

```tsx
{place.lat != null && place.lng != null ? (
  <a
    className="paper-button-ghost px-2 py-1 text-xs"
    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => e.stopPropagation()}
  >
    Directions
  </a>
) : null}
```

---

## Verification

1. Open Sources mode → select a source → place cards should now show address below name
2. Cards with opening hours should show a clickable "Hours" toggle
3. Cards with lat/lng should have a "Directions" link that opens Google Maps directions
4. Rating + review count still display as before (no regression)
5. Cards without address/hours/coords gracefully omit those elements

---

## Files to touch

- `supabase/migrations/20260413000001_list_user_social_sources_v4.sql` — add `address`, `opening_hours` to RPC
- `lib/social/user-sources-contract.ts` — extend `UserSocialSourcePlace` type
- `components/stitch/SourcesPanel.tsx` — render address, hours toggle, directions link in `SourcePlaceCard`

## Do NOT touch

- `SourcesShellPaper.tsx` — layout changes are N5c
- `InspectorCard.tsx` — that's N4
- `PlaceDrawer.tsx` — that's N2+N4
