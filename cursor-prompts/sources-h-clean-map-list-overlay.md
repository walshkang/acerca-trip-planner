# Sources H — Clean map in Sources mode: suppress user pins, list overlay toggle, unvetted markers

## Goal

In Sources mode the map should be a clean canvas for social source places. User's personal pins should not appear by default. A compact overlay lets users toggle one of their trip lists on top to compare. Social source places (AI-extracted, not user-vetted) need a visually distinct "pending" marker.

Three sub-slices — implement in order.

---

## H1 — `suppressPlaceFetch` prop on MapShell

### `components/map/MapShell.tsx`

Add to `MapShellProps`:

```ts
/** When true, skip fetching user places. Map starts empty (social places only). */
suppressPlaceFetch?: boolean
```

In the `fetchPlaces` callback, guard the fetch:

```ts
const fetchPlaces = useCallback(async () => {
  if (suppressPlaceFetch) {
    setPlaces([])
    setLoading(false)
    setIsAuthed(true)
    setAuthChecked(true)
    return
  }
  // ... existing fetch logic unchanged
}, [suppressPlaceFetch, ...existingDeps])
```

Also skip the `activeListPlaceIds`-triggered re-fetch when `suppressPlaceFetch` is true:

```ts
useEffect(() => {
  if (suppressPlaceFetch) return
  if (!activeListPlaceIds.length) return
  const missing = activeListPlaceIds.some((id) => !placeIdSet.has(id))
  if (missing) fetchPlaces()
}, [suppressPlaceFetch, activeListPlaceIds, fetchPlaces, placeIdSet])
```

### `components/app/SourcesShellPaper.tsx`

Pass `suppressPlaceFetch` to MapShell:

```tsx
<MapShell
  ref={mapShellRef}
  suppressPlaceFetch
  ...
/>
```

---

## H2 — Trip-list overlay toggle

### `components/app/SourcesShellPaper.tsx`

Add state:

```ts
const [overlayListId, setOverlayListId] = useState<string | null>(null)
const [overlayListPlaceIds, setOverlayListPlaceIds] = useState<string[]>([])
const [tripLists, setTripLists] = useState<{ id: string; name: string }[]>([])
```

Fetch trip lists once on mount:

```ts
useEffect(() => {
  fetch('/api/lists')
    .then((r) => r.json())
    .then((body: { lists?: { id: string; name: string; list_type?: string }[] }) => {
      setTripLists((body.lists ?? []).filter((l) => (l.list_type ?? 'trip') === 'trip'))
    })
    .catch(() => {})
}, [])
```

Toggle handler — fetch place IDs for the selected list:

```ts
async function handleOverlayListToggle(listId: string) {
  if (overlayListId === listId) {
    setOverlayListId(null)
    setOverlayListPlaceIds([])
    return
  }
  setOverlayListId(listId)
  try {
    const res = await fetch(`/api/lists/${listId}/items?limit=200`)
    const body = (await res.json()) as { items?: { place?: { id?: string } }[] }
    const ids = (body.items ?? [])
      .map((item) => item.place?.id)
      .filter((id): id is string => typeof id === 'string')
    setOverlayListPlaceIds(ids)
  } catch {
    setOverlayListPlaceIds([])
  }
}
```

Pass overlay to MapShell (replaces the hardcoded empty props):

```tsx
<MapShell
  ref={mapShellRef}
  suppressPlaceFetch
  activeListId={overlayListId}
  activeListPlaceIds={overlayListPlaceIds}
  activeListItems={[]}
  activeListTypeFilters={[]}
  ...
/>
```

### List toggle UI — render in the map column

Place this inside the map column `<div>`, above the `{researchListId ? ... : null}` search-this-area block. Only show when `tripLists.length > 0` and not on mobile:

```tsx
{tripLists.length > 0 ? (
  <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
    {tripLists.map((list) => (
      <button
        key={list.id}
        type="button"
        onClick={() => void handleOverlayListToggle(list.id)}
        className={`pointer-events-auto rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition-colors ${
          overlayListId === list.id
            ? 'border-paper-primary bg-paper-primary text-white'
            : 'border-paper-tertiary-fixed bg-paper-surface-container/90 text-paper-on-surface'
        }`}
      >
        {list.name}
      </button>
    ))}
  </div>
) : null}
```

---

## H3 — Unvetted marker style for social source places

### `components/map/MapView.types.ts`

Add to `MapPlace`:

```ts
/** True for AI-extracted social source places that haven't been user-approved. */
isUnvetted?: boolean
```

### `components/app/SourcesShellPaper.tsx`

In `sourceMapPlaces` memo, add `isUnvetted: true` to every place:

```ts
.map((place) => ({
  id: place.place_id,
  name: place.place_name,
  category: place.category as CategoryEnum,
  lat: place.lat!,
  lng: place.lng!,
  mentionCount: 1,
  isUnvetted: true,   // ADD
}))
```

### `components/map/MapView.maplibre.tsx`

In the marker render loop, branch on `place.isUnvetted` before computing emoji:

```tsx
{place.isUnvetted ? (
  // Placeholder marker — plain dot, no category emoji, muted palette
  <span
    aria-hidden="true"
    className={`flex items-center justify-center rounded-full ${markerSizeClass} bg-stone-400/80 ring-1 ring-stone-300/60 ${markerStateClassName}`}
  >
    <span className="block h-2 w-2 rounded-full bg-white/80" />
  </span>
) : (
  // Existing marker — unchanged
  <span
    aria-hidden="true"
    className={`flex items-center justify-center rounded-full ${markerSizeClass} ${markerBackdropClassName} ${socialMarkerRingClassName} ${markerStateClassName}`}
  >
    <span className="text-[18px] leading-none">
      {resolveCategoryEmoji?.(place.category) ?? getCategoryEmoji(place.category)}
    </span>
  </span>
)}
```

The muted stone-gray dot reads as "provisional" — no category claim until vetted.

---

## What NOT to change

- `MapView.mapbox.tsx` — only update maplibre (mapbox path is legacy)
- `ResearchTriagePanel` — no changes (research places are a separate flow, they use `overlapCount` not `isUnvetted`)
- `ExploreShellPaper`, `PlannerShellPaper` — neither passes `suppressPlaceFetch`, so they're unaffected
- Existing `socialMarkerSizeClass` / `researchOverlapMarkerSizeClass` sizing — keep using them for unvetted places (sizing by mentionCount is fine)

---

## Run order

H1 → H2 → H3. Each is independently testable.

Run `npm run check` before committing.
