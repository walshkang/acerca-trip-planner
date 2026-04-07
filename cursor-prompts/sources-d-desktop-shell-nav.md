# Sources Redesign — Slice D: Desktop Shell + Navigation

> **Read first:** `cursor-prompts/agent_task.md` — preamble, invariants, and DoD (including CONTEXT.md update requirement).

## Goal

1. **Desktop layout for Sources**: left panel (SourcesPanel, ~380px) + full map on the right — same split as Explore mode
2. **Sources tab visible from Map and Itinerary headers** — users can navigate into Sources mode from anywhere
3. **Map in Sources mode** shows pins for places in the currently selected source

**Depends on Slice C (SourcesPanel redesign).**

---

## Files to read first

- `components/app/SourcesShellPaper.tsx` — current implementation (full-screen list only)
- `components/app/ExploreShellPaper.tsx` — desktop split layout pattern to mirror (MapShell + PaperExplorePanel right rail)
- `components/paper/PaperHeader.tsx` — line ~191: `visibleTabs` filters out `sources` tab; fix this
- `components/app/PlannerShellPaper.tsx` — `onTabChange` handler (add `sources` case)
- `components/map/MapShell.tsx` — props interface for the map component
- `lib/state/useNavStore.ts` — `setMode`, confirm `'sources'` is already a valid mode value
- `lib/state/useSocialDiscoveryStore.ts` — social places data (for filtering pins to active source)
- `lib/social/user-sources-contract.ts` — `UserSocialSourcePlace` shape

---

## Changes

### 1. `components/paper/PaperHeader.tsx` — make Sources tab always visible

Currently (line ~191):
```typescript
const visibleTabs =
  activeTab === 'sources' ? tabs : tabs.filter((t) => t.id !== 'sources')
```

Change to:
```typescript
const visibleTabs = tabs
```

Sources tab is now always shown in the nav when `activeTab` and `onTabChange` are provided.

---

### 2. `components/app/ExploreShellPaper.tsx` — handle Sources tab

In `onTabChange`:
```typescript
onTabChange={(tab) => {
  if (tab === 'itinerary') setMode('plan')
  if (tab === 'sources') setMode('sources')   // add this line
}}
```

---

### 3. `components/app/PlannerShellPaper.tsx` — handle Sources tab

In `onTabChange`:
```typescript
onTabChange={(tab) => {
  if (tab === 'map') setMode('explore')
  if (tab === 'sources') setMode('sources')   // add this line
}}
```

---

### 4. `components/app/SourcesShellPaper.tsx` — desktop split layout

Rewrite to match the Explore shell's two-column pattern:

**Mobile (< `md`):** full-screen panel only (same as today — map is distracting on small screens)

**Desktop (`md+`):** left panel (380px fixed) + map filling the rest

```
┌── PaperHeader (full width, clearRightRail=false) ──────────────────────────┐
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌── SourcesPanel (380px, left) ──┐ ┌── MapShell (flex-1, right) ──────────┐ │
│ │ [URL ingest]          [Add]    │ │                                       │ │
│ │ Source: [▼ Bangkok Food…]      │ │  (pins for selected source's places)  │ │
│ │                                │ │                                       │ │
│ │  [Place card]                  │ │                                       │ │
│ │  [Place card]                  │ │                                       │ │
│ │  …                             │ │                                       │ │
│ └────────────────────────────────┘ └───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Map pins for Sources mode

- Source: `useSocialDiscoveryStore` already holds `socialPlaces` (all social places from `discover_social_places` RPC)
- In Sources mode, filter to only the places belonging to the active source (match by `place_id` against `UserSocialSourcePlace[]` from the selected source)
- Pass filtered places as `MapPlace[]` to `MapShell`
- On map pin click: open `PlaceDrawer` overlay (same mechanism as Explore mode)

#### `PlaceDrawer` overlay in Sources mode

- Mount `PlaceDrawer` in `SourcesShellPaper` (like `ExploreShellPaper` does)
- Use local state `focusedPlaceId: string | null` to control it
- Pass `onMoreDetails={(placeId) => setFocusedPlaceId(placeId)}` down to `SourcesPanel`
- When `focusedPlaceId` is set, render `PlaceDrawer` in an overlay on top of both columns

#### Mobile layout

On mobile, show only `SourcesPanel` (full screen), no map. Keep `PaperHeader` with all three tabs.

---

### 5. Remove `SourcesExportSheet` and `useSourcesStore`

These were part of the old batch-export flow replaced in Slice C. If they have no other consumers:
- Delete `components/stitch/SourcesExportSheet.tsx`
- Delete `lib/state/useSourcesStore.ts`
- Delete `lib/social/sources-export-payload.ts`

Verify with a grep that nothing else imports them before deleting.

---

## Definition of Done

- [ ] On desktop (`md+`), Sources mode shows left panel + map side by side
- [ ] Sources tab is visible in PaperHeader from Map and Itinerary modes
- [ ] Clicking Sources tab from Map/Itinerary navigates to Sources mode
- [ ] Map shows pins for places in the selected source only
- [ ] Clicking a map pin or "More details" opens PlaceDrawer overlay
- [ ] Mobile layout remains full-screen panel (no map)
- [ ] Stale export files deleted (if no other consumers)
- [ ] `npm run check` passes
- [ ] `CONTEXT.md` updated: Slice D marked **Done**, Sources Redesign block moved to Completed Phases, "Current Phase" updated to next active work
