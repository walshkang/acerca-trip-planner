# Social Discovery S4.4 — PlaceDrawer "Mentioned by" Section

## What to build

When the user taps a social place pin, the existing PlaceDrawer opens. Add a "Mentioned by" section below the existing place details that shows which creators mentioned this place, with their platform, persona badge, and the exact snippet.

Only renders for social places (where `source = 'social'` on the place record). User-saved places are unaffected.

## Files to modify

- `components/stitch/PlaceDrawer.tsx` — add mentions section
- `app/api/places/[id]/details/route.ts` — extend response to include social mentions for social places

## Files to reference (read these first)

- `components/stitch/PlaceDrawer.tsx` — read fully. The component fetches place details at line ~90+ via `/api/places/[id]/details`. It renders curated data, user notes, list membership. Find where the main content section ends to add the mentions below.
- `app/api/places/[id]/details/route.ts` — current response shape. You'll add a `social_mentions` field to the response for social places.
- `lib/supabase/types.ts` — `social_mentions` and `social_sources` table types (after S1 migration + db:types)
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 4 spec for the drawer UI

## Implementation

### 1. Extend the place details API route

In `app/api/places/[id]/details/route.ts`, after fetching the place row, check if `place.source === 'social'`. If so, fetch the mentions:

```typescript
let socialMentions: SocialMentionRow[] | null = null

if (place.source === 'social') {
  const { data: mentions } = await supabase
    .from('social_mentions')
    .select(`
      snippet,
      sentiment,
      social_sources (
        author_name,
        platform,
        author_persona,
        url,
        title
      )
    `)
    .eq('place_id', place.id)
    .order('created_at', { ascending: false })
    .limit(10)

  socialMentions = mentions ?? null
}

// Add to the response:
return NextResponse.json({
  place: { ... },
  enrichment: { ... },
  google: { ... },
  social_mentions: socialMentions,   // null for non-social places
})
```

### 2. Update PlaceDrawer to render the mentions section

In `PlaceDrawer.tsx`:

1. Add `social_mentions` to the `PlaceDetailsResponse` type:
```typescript
social_mentions: Array<{
  snippet: string
  sentiment: string | null
  social_sources: {
    author_name: string
    platform: string
    author_persona: string
    url: string
    title: string | null
  } | null
}> | null
```

2. After the existing curated data / user notes / list membership sections, add:

```tsx
{details.social_mentions && details.social_mentions.length > 0 && (
  <section className="border-t border-paper-tertiary-fixed px-4 py-3">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-secondary">
      Mentioned by
    </p>
    <div className="flex flex-col gap-3">
      {details.social_mentions.map((mention, i) => {
        const source = mention.social_sources
        if (!source) return null
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-paper-primary">
                {source.author_name}
              </span>
              <span className="rounded-full bg-paper-surface-container px-1.5 py-0.5 text-[10px] text-paper-secondary capitalize">
                {source.platform}
              </span>
              <span className="rounded-full bg-paper-surface-container px-1.5 py-0.5 text-[10px] text-paper-secondary capitalize">
                {source.author_persona}
              </span>
            </div>
            <p className="text-xs italic text-paper-secondary leading-relaxed">
              "{mention.snippet}"
            </p>
          </div>
        )
      })}
    </div>
  </section>
)}
```

3. If the place has `source === 'social'` and no enrichment data, skip the enrichment/wiki sections gracefully — just show name, category, and the mentions section.

## What NOT to do

- Don't add this section for user-saved places — check `source === 'social'` before rendering
- Don't add a "Save this place" button in this slice — that's a future feature
- Don't fetch mentions separately from the client — extend the existing `/api/places/[id]/details` call, not a new endpoint
- Don't modify PlaceListMembershipEditor or PlaceUserMetaForm — those are unchanged

## Verification

1. After seeding (S3.3), click a Bangkok social pin on the map
2. PlaceDrawer opens showing place name and category
3. "Mentioned by" section appears with 1–2 entries (depending on the place)
4. Each entry shows author name, platform badge, persona badge, and the snippet in italics
5. Click a user-saved place — no "Mentioned by" section appears
