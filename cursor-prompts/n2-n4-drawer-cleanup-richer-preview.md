# N2 + N4 — Remove social URLs from PlaceDrawer + Richer search preview

Combined because both touch `PlaceDrawer.tsx`. Two independent changes in one pass.

**Model: Sonnet** — straightforward UI additions/removals.

---

## Part 1: N2 — Remove social source URLs from PlaceDrawer

### Problem

The "Mentioned by" section in `PlaceDrawer.tsx` (lines 765–811) shows social mention snippets with author name, platform chip, and persona chip. The source URL is used as a React key (`source.url`) but isn't rendered as a visible link — **check if this is actually a problem or already correct**.

If source URLs *are* being rendered as clickable links somewhere in the drawer (possibly via the `social_sources.url` field), remove them. Source attribution belongs in `SourcesPanel`, not the map drawer.

### What to check

In `PlaceDrawer.tsx`, the mention rendering block (lines 782–809):
- `source.url` is only used in the React key: `key={\`${source.url}:${index}\`}` — this is fine, keep it
- Author name, platform chip, persona chip, and snippet are rendered — these are fine
- If no actual URL links are rendered, **N2 is already done** — verify and move on

### If URLs are rendered

Remove any `<a href={source.url}>` or similar link elements from the mention cards. Keep author name, platform, persona, and snippet.

---

## Part 2: N4 — Add rating, review count, and directions to search preview

### Problem

`InspectorCard.tsx` shows name, address, neighborhood, hours, Google types, website, and Google Maps link — but no Google rating, review count, or directions link.

### Changes to `InspectorCard.tsx`

#### 1. Add rating + review count to `DiscoveryGoogleDetails`

In `lib/state/useDiscoveryStore.ts`, the `DiscoveryGoogleDetails` type (line 23) needs:

```ts
export type DiscoveryGoogleDetails = {
  website: string | null
  url: string | null
  types: string[] | null
  opening_hours: { ... } | null
  rating: number | null        // ADD
  review_count: number | null  // ADD
}
```

#### 2. Feed rating data from the API

Check `lib/server/discovery/suggest.ts` — when Google details are fetched during preview, the response likely already includes `rating` and `user_ratings_total`. Make sure these are passed through to the client in the preview response.

Also check the `previewResult` action in `useDiscoveryStore.ts` — it calls an API to get Google details. That API response needs to include rating fields.

#### 3. Render in InspectorCard

Add rating + review count after the address/neighborhood block (around line 307), before the "More details" button:

```tsx
{google?.rating != null ? (
  <div className="flex items-center gap-1.5 mt-1">
    <span className="text-xs font-semibold text-paper-on-surface">
      {google.rating.toFixed(1)}
    </span>
    <span className="text-[11px] text-paper-on-surface-variant">
      ★
    </span>
    {google.review_count != null ? (
      <span className="text-[11px] text-paper-on-surface-variant">
        ({google.review_count.toLocaleString()} reviews)
      </span>
    ) : null}
  </div>
) : null}
```

#### 4. Add directions link

After the Google Maps link section (around line 400), add a directions link:

```tsx
{candidate.lat != null && candidate.lng != null ? (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[11px] font-semibold text-paper-on-surface">
      Directions
    </span>
    <a
      className="truncate text-[11px] text-paper-primary underline transition-colors hover:text-paper-primary-container"
      href={`https://www.google.com/maps/dir/?api=1&destination=${candidate.lat},${candidate.lng}`}
      target="_blank"
      rel="noreferrer"
    >
      Open
    </a>
  </div>
) : null}
```

Note: `candidate` may not have lat/lng directly. Check `selectedResult` in the store — it has `lat`/`lng` from the suggest API. You may need to pass it through or read from the store.

#### 5. Also add directions to PlaceDrawer

In `PlaceDrawer.tsx`, add a directions link in the details section (after the Google section, around line 728). The place has `lat`/`lng` in props:

```tsx
{place.lat != null && place.lng != null ? (
  <div>
    <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Directions</p>
    <a
      className={`mt-1 text-xs underline ${bodyTextClass}`}
      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
      target="_blank"
      rel="noreferrer"
    >
      Open in Google Maps
    </a>
  </div>
) : null}
```

---

## Verification

### N2
1. Open a social place on the map → PlaceDrawer opens
2. Click "Show details" → "Mentioned by" section should show author, platform, persona, snippet
3. No clickable source URLs should appear in the drawer

### N4
1. Search for a place in the Omnibox → click a result → InspectorCard opens
2. Rating (e.g., "4.5 ★") and review count should appear below the address
3. "More details" section should include a "Directions → Open" link
4. PlaceDrawer should also have a "Directions" link when viewing any place with coordinates

---

## Files to touch

- `components/stitch/PlaceDrawer.tsx` — verify N2 (social URLs), add directions link
- `components/stitch/InspectorCard.tsx` — add rating, review count, directions link
- `lib/state/useDiscoveryStore.ts` — extend `DiscoveryGoogleDetails` type with `rating` + `review_count`
- Possibly `lib/server/discovery/suggest.ts` or the preview/details API — ensure rating data flows through

## Do NOT touch

- `SourcesPanel.tsx` — social source URLs belong there, not being changed
- `SourcesShellPaper.tsx`
