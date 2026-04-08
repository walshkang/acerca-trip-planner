# Sources G — Click source card to highlight place on map

## Goal

When a user clicks a source place card in `SourcesPanel`, the corresponding pin on the map should highlight (pan to it, visually active). This is a lightweight "scout mode" — just map focus, no drawer. The "More details" button already opens the `PlaceDrawer` overlay and should keep doing that.

The key difference from the saved-list flow: these are temporary suggestions, so we don't want the full drawer to open on card click — just map awareness.

---

## Changes

### 1. `SourcesShellPaper.tsx`

Add a second piece of state: `mapPinnedPlaceId`. This is set when a card is clicked (scout focus). It is distinct from `focusedPlaceId` (which opens the PlaceDrawer).

```ts
const [mapPinnedPlaceId, setMapPinnedPlaceId] = useState<string | null>(null)
```

Wire `MapShell`:
- `selectedPlaceId={mapPinnedPlaceId ?? focusedPlaceId}` — map highlights pinned OR drawer-open place
- Keep `setPlaceParam`, `focusedListPlaceId`, `setFocusedListPlaceId` pointing at `focusedPlaceId` as before

When `focusedPlaceId` changes (drawer opens), clear `mapPinnedPlaceId`:
```ts
useEffect(() => {
  if (focusedPlaceId) setMapPinnedPlaceId(null)
}, [focusedPlaceId])
```

Pass `onCardSelect` down to `SourcesPanel`:
```tsx
<SourcesPanel
  ...
  onCardSelect={(placeId) => {
    setMapPinnedPlaceId((prev) => (prev === placeId ? null : placeId))
  }}
/>
```

### 2. `SourcesPanel.tsx`

Add `onCardSelect?: (placeId: string) => void` to `SourcesPanelProps`.

Pass it into `SourcePlaceCard`:
```tsx
<SourcePlaceCard
  key={place.place_id}
  place={place}
  activeListId={activeListId}
  onMoreDetails={(placeId) => onMoreDetails?.(placeId)}
  onCardSelect={onCardSelect}
/>
```

### 3. `SourcePlaceCard` (inside `SourcesPanel.tsx`)

Add `onCardSelect?: (placeId: string) => void` to props.

Add `isSelected` prop (boolean) — passed from parent based on whether this card's `place_id` matches the pinned id.

Wrap the card in a button/clickable div:

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => onCardSelect?.(place.place_id)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardSelect?.(place.place_id) }}
  className={`rounded border bg-paper-surface-container px-3 py-3 cursor-pointer transition-colors ${
    isSelected
      ? 'border-paper-primary ring-1 ring-paper-primary'
      : 'border-paper-tertiary-fixed'
  }`}
>
  {/* existing card content unchanged */}
</div>
```

Track `isSelected` in the `SourcesPanel` source place list — pass `(mapPinnedPlaceId === place.place_id)` as a prop, or manage locally via the `onCardSelect` callback returning to the panel. Simplest: lift `mapPinnedSourcePlaceId` state into `SourcesPanel` locally (not into the shell), and pass the active ID down. Then shell only needs `onCardSelect` to sync for the map:

```ts
// In SourcesPanel:
const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

function handleCardSelect(placeId: string) {
  const next = selectedPlaceId === placeId ? null : placeId
  setSelectedPlaceId(next)
  onCardSelect?.(next ?? '')  // or use null — shell clears mapPinnedPlaceId on ''
}
```

Adjust shell: treat empty string as null for `mapPinnedPlaceId`.

---

## What NOT to change

- `PlaceDrawer` overlay — still opens only via "More details" button
- `ResearchTriagePanel` — untouched
- `MapShell` props signature — only changing which value is passed to `selectedPlaceId`
- Mobile behavior — on mobile the map isn't visible in Sources, so `onCardSelect` is a no-op visually (fine, keep it wired anyway)

---

## Tests

No new tests. Run `npm run check` before committing.
