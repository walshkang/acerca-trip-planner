# Sources-I — List picker for "Add to list" in SourcesPanel

## Goal

When a user clicks **"+ Add to list"** on a source place card, the place is added to whichever trip list is currently active in the app — not necessarily the one they want to build. Add a **persistent list picker** at the top of `SourcesPanel` so users can choose their target trip list once and have all subsequent "Add to list" actions go there.

**Model: Sonnet** — data plumbing + one new `<select>` control. No schema change.

---

## Context (the problem)

`SourcesPanel.tsx` line 258:

```ts
const activeListId = useTripStore((s) => s.activeListId)
```

This is passed to every `SourcePlaceCard` as the `activeListId` prop, and cards POST to `/api/lists/${activeListId}/items`. If the user has "Tokyo Trip" active but is researching "Bangkok", they must switch their active list before saving — which breaks the exploration flow.

The fix: add a `targetListId` state to `SourcesPanel`, initialized from `activeListId` but independently controllable via a `<select>`.

---

## Implementation

### `components/stitch/SourcesPanel.tsx`

#### 1. Add state + fetch trip lists

In the `SourcesPanel` function body, after line 258:

```ts
const [targetListId, setTargetListId] = useState<string | null>(activeListId)
const [tripLists, setTripLists] = useState<{ id: string; name: string }[]>([])

// Sync targetListId when activeListId changes (first load / list switch from elsewhere)
useEffect(() => {
  setTargetListId((prev) => prev ?? activeListId)
}, [activeListId])

// Fetch all trip-type lists once
useEffect(() => {
  fetch('/api/lists')
    .then((r) => r.json())
    .then((body: { lists?: { id: string; name: string; list_type?: string }[] }) => {
      const trips = (body.lists ?? []).filter((l) => (l.list_type ?? 'trip') === 'trip')
      setTripLists(trips)
      // If no target yet (first render with activeListId null), default to first trip list
      setTargetListId((prev) => prev ?? trips[0]?.id ?? null)
    })
    .catch(() => {})
}, [])
```

#### 2. Render the list picker

Place this **below** the `<SocialUrlIngest />` sticky block and **above** the `<div className="flex-1 min-h-0 overflow-y-auto">`. Only show when `tripLists.length > 1` (if there's only one list, no picker needed).

```tsx
{tripLists.length > 1 ? (
  <div className="border-b border-paper-tertiary-fixed bg-paper-surface-warm px-3 py-2">
    <label
      htmlFor="sources-target-list"
      className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-on-surface-variant"
    >
      Save to list
    </label>
    <select
      id="sources-target-list"
      value={targetListId ?? ''}
      onChange={(e) => setTargetListId(e.target.value || null)}
      className="mt-1 w-full rounded border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1.5 text-sm text-paper-on-surface focus:outline-none focus:ring-1 focus:ring-paper-primary"
    >
      {tripLists.map((list) => (
        <option key={list.id} value={list.id}>
          {list.name}
        </option>
      ))}
    </select>
  </div>
) : null}
```

#### 3. Pass `targetListId` to cards

In the `SourcePlaceCard` render at line 424:

```tsx
<SourcePlaceCard
  key={place.place_id}
  place={place}
  activeListId={targetListId}   // was: activeListId
  onMoreDetails={(placeId) => onMoreDetails?.(placeId)}
  onCardSelect={(placeId) => { ... }}
  isSelected={selectedPlaceId === place.place_id}
/>
```

That's it — `SourcePlaceCard` already uses `activeListId` for the POST, disables the button when `activeListId` is null, and shows "Added ✓" / "Already added" feedback. No changes needed to the card itself.

---

## Verification

1. Open Sources mode with ≥2 trip lists
2. A "Save to list" dropdown appears above the source cards, showing all trip-type lists
3. Default selection = the app's active list (or first list if none)
4. Change the picker to a different list → click "Add to list" on a card → place is added to the selected list (verify in `/api/lists/{id}/items` or by switching to that list in Planner)
5. The source picker (top) still works independently — changing source doesn't reset the list picker
6. With only 1 trip list: the dropdown does not render (no cluttered UI for single-list users)
7. `npm run check` passes

---

## Files to touch

- `components/stitch/SourcesPanel.tsx` — add `targetListId` state, list fetch effect, picker UI, swap prop on cards

## Do NOT touch

- `SourcePlaceCard` (inner component in `SourcesPanel.tsx`) — no changes; it already handles all states via `activeListId` prop
- `SourcesShellPaper.tsx` — no changes; the picker lives entirely inside `SourcesPanel`
- `useTripStore.ts` — `activeListId` continues to drive the global app state; `targetListId` is local panel state
