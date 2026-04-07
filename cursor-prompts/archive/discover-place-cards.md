# Discover Place Cards with Google Rating

## What to build

Upgrade place cards in the discover drawer to a proper boxed card layout showing Google star ratings and review counts. Add rating data to the Google Places fetch and surface it through the enrichment pipeline.

## Files to modify

- `lib/enrichment/sources.ts` — add `rating` and `user_ratings_total` to Google Places API fields
- `lib/enrichment/contract.ts` (or wherever the enrichment snapshot shape is defined) — add rating fields
- `app/api/places/ingest/route.ts` — store rating data in enrichment snapshot
- `app/api/lists/[id]/items/route.ts` — include rating in API response
- `components/stitch/ListDetailBody.tsx` — upgrade place card rendering

## Files to reference (read these first)

- `DESIGN.md` — design tokens, card styling patterns.
- `lib/enrichment/sources.ts` — `fetchGooglePlace` function, `GooglePlacesResult` type, field list at ~line 281.
- `app/api/places/ingest/route.ts` — full ingest pipeline to understand how enrichment data is stored.
- `components/stitch/ListDetailBody.tsx` — current `PlaceSummary` type and place card rendering (~lines 842–937).
- `components/stitch/InspectorCard.tsx` — reference for card styling patterns.

## Implementation steps

### 1. Add rating fields to Google Places fetch

**File:** `lib/enrichment/sources.ts` (~line 281–290)

Add `'rating'` and `'user_ratings_total'` to the `fields` array:

```typescript
const fields = [
  'place_id',
  'name',
  'formatted_address',
  'geometry',
  'opening_hours',
  'types',
  'website',
  'url',
  'rating',              // ← add
  'user_ratings_total',  // ← add
].join(',')
```

Update the `GooglePlacesResult` type (find its definition in this file) to include:
```typescript
rating?: number
user_ratings_total?: number
```

### 2. Store rating in enrichment snapshot

Trace the ingest pipeline in `app/api/places/ingest/route.ts` to find where Google data is stored as a JSON blob (the frozen enrichment). Add `google_rating` and `google_review_count` to whatever shape is written to the database.

The frozen enrichment pattern ensures this data is captured at ingest time and doesn't change. For existing places that were ingested before this change, these fields will be `null` — that's fine.

### 3. Surface rating in the items API response

**File:** `app/api/lists/[id]/items/route.ts` (or wherever `PlaceSummary` / list item data is built)

Include `google_rating` and `google_review_count` in the place data returned to the client. Follow the same pattern used for `address`, `category`, etc.

### 4. Update PlaceSummary type

**File:** `components/stitch/ListDetailBody.tsx` (~line 27–34)

Add to `PlaceSummary`:
```typescript
export type PlaceSummary = {
  id: string
  name: string
  category: CategoryEnum
  address: string | null
  created_at: string
  user_notes: string | null
  google_rating: number | null    // ← add
  google_review_count: number | null  // ← add
}
```

### 5. Upgrade place cards to boxed layout with rating

**File:** `components/stitch/ListDetailBody.tsx` (~lines 842–937)

Replace the current place row rendering with a proper card layout. Each place gets:

```
┌─────────────────────────────────────────────────┐
│  [🍽]  PLACE NAME                               │
│        Restaurant                                │
│        123 Main St, Bangkok                      │
│        ★ 4.5 (1,234 reviews)                    │
│                                                  │
│        [tag1] [tag2] [+ Add tags]               │
└─────────────────────────────────────────────────┘
```

Implementation details:

1. **Card wrapper:** Use `rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-warm p-3` on both mobile and desktop. Replace the current split styling (rounded-md mobile, border-dotted-bottom desktop).

2. **Emoji icon:** Keep the existing 8×8 emoji box, but show it on all viewports (currently `hidden md:inline-flex` — change to always visible).

3. **Place name:** Keep the existing headline styling.

4. **Category chip:** Keep as-is.

5. **Address:** Keep as-is.

6. **Star rating row** (new): Below the address, show rating if available:
   ```tsx
   {place.google_rating != null && (
     <p className="mt-1 flex items-center gap-1 text-xs text-paper-on-surface-variant">
       <span className="text-amber-500">★</span>
       <span className="font-medium">{place.google_rating.toFixed(1)}</span>
       {place.google_review_count != null && (
         <span>({place.google_review_count.toLocaleString()} reviews)</span>
       )}
     </p>
   )}
   ```
   If `google_rating` is null (old places), simply don't show the rating row.

7. **Tag editor:** Keep the existing `TagEditor` component inline at the bottom of each card.

8. **Spacing:** Use `gap-3` between cards (consistent with current `space-y-3`).

9. **Focused state:** Keep the existing `focusedRowClass` glow effect, adapted for the new card shape.

## What NOT to do

- Don't backfill existing places with rating data — new places only.
- Don't remove the TagEditor from place cards — keep it as-is.
- Don't change the PlaceDrawer or InspectorCard components.
- Don't modify the export pipeline or import contract.
- Don't add rating to the database schema as a separate column — store it in the enrichment JSON blob alongside other Google data.
