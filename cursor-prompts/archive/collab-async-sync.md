# Collaboration — Async Sync (P3)

## What to build

Make multi-user editing feel reliable without realtime. When two people edit the same list, each sees the other's changes on tab focus / page return. Last write wins — no merge logic.

## Context

The app already has the plumbing:
- `useTripStore.bumpListItemsRefresh()` increments `listItemsRefreshKey`, which is in the dependency array of the `fetchPlan()` effect in CalendarPlanner and the map-places fetch in PlannerShellPaper
- Mutations use optimistic updates with rollback on failure
- No existing refetch-on-focus or polling — that's what this slice adds

## Files to reference (read these first)

- `lib/state/useTripStore.ts` — `listItemsRefreshKey`, `bumpListItemsRefresh()`, `activeListItems`
- `components/planner/CalendarPlanner.tsx` — `fetchPlan()` (~line 218), how `listItemsRefreshKey` triggers refetch
- `components/app/PlannerShellPaper.tsx` — uses `listItemsRefreshKey` for map data refresh (~line 112)

## Files to modify

- `lib/state/useTripStore.ts` — add `lastFetchedAt` timestamp
- `components/planner/CalendarPlanner.tsx` — add visibility-change refetch + freshness indicator
- `components/app/PlannerShellPaper.tsx` — (optional) same visibility refetch for map data

## Implementation steps

### 1. Add visibility-change refetch to CalendarPlanner

**File:** `components/planner/CalendarPlanner.tsx`

Add an effect that listens for tab focus and triggers a refetch:

```typescript
// Refetch on tab focus (async collab — pick up other users' changes)
useEffect(() => {
  let lastRefetch = Date.now()
  const MIN_REFETCH_INTERVAL = 30_000 // 30s debounce

  const handleVisibilityChange = () => {
    if (document.hidden) return
    if (Date.now() - lastRefetch < MIN_REFETCH_INTERVAL) return
    lastRefetch = Date.now()
    void fetchPlan()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [fetchPlan])
```

This ensures that when a user switches back to the tab, the list data refreshes — but not more than once every 30 seconds.

### 2. Add `lastFetchedAt` to useTripStore

**File:** `lib/state/useTripStore.ts`

Add a timestamp so the UI can show when data was last fetched:

```typescript
// Add to state type:
lastFetchedAt: number | null

// Add to initial state:
lastFetchedAt: null,

// Add action:
setLastFetchedAt: (t: number) => set({ lastFetchedAt: t }),
```

### 3. Set `lastFetchedAt` after successful fetches

**File:** `components/planner/CalendarPlanner.tsx`

In `fetchPlan()`, after successfully setting items, also update the timestamp:

```typescript
// After setItems(data.items) or equivalent:
useTripStore.getState().setLastFetchedAt(Date.now())
```

### 4. Add a subtle freshness indicator

**File:** `components/planner/CalendarPlanner.tsx` (or a small new component)

Show a small "Updated X ago" label in the planner toolbar area. Keep it minimal:

```typescript
function FreshnessLabel() {
  const lastFetchedAt = useTripStore((s) => s.lastFetchedAt)
  const [, forceUpdate] = useState(0)

  // Tick every 30s to update the relative time
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!lastFetchedAt) return null

  const seconds = Math.floor((Date.now() - lastFetchedAt) / 1000)
  let label: string
  if (seconds < 60) label = 'Just now'
  else if (seconds < 3600) label = `${Math.floor(seconds / 60)}m ago`
  else label = `${Math.floor(seconds / 3600)}h ago`

  return (
    <span className="text-xs text-paper-secondary">{label}</span>
  )
}
```

Place this in the planner toolbar area, near the date range or list name. It should be unobtrusive — just a confidence signal that the data is current.

### 5. Handle stale detail panel gracefully

When a refetch happens and an item the user was viewing has been deleted by another collaborator, handle it gracefully:

- If `focusedPlannerPlaceId` points to a place that's no longer in the list after refetch, clear it:
```typescript
// After refetch, in the items sync effect:
const placeIds = new Set(newItems.map(i => i.place_id))
const focused = useTripStore.getState().focusedPlannerPlaceId
if (focused && !placeIds.has(focused)) {
  useTripStore.getState().setFocusedPlannerPlaceId(null)
}
```

### 6. Verify concurrent edits work

**Manual test plan:**
1. Open the same shared list in two browser windows (or one incognito)
2. In window A: schedule an item to a day
3. Switch to window B: the change should appear after the 30s debounce (or immediately on tab focus if >30s passed)
4. In window B: delete an item
5. Switch to window A: item should disappear on refetch
6. Verify no console errors or duplicate items

## What NOT to do

- Don't add WebSocket/Supabase Realtime — that's Phase 4
- Don't add merge/conflict resolution — last write wins is fine
- Don't add polling on a timer — visibility-change is sufficient for async
- Don't modify API routes — the existing fetch endpoints are fine
- Don't add toast notifications for every refetch — the freshness label is enough
