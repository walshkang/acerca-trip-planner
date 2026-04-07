# Sources Redesign — Slice C: SourcesPanel UI

> **Read first:** `cursor-prompts/agent_task.md` — preamble, invariants, and DoD (including CONTEXT.md update requirement).

## Goal

Replace the current accordion-per-source layout in `SourcesPanel` with a richer browsing experience:

1. **Source dropdown** at the top — select which ingested source to browse
2. **Place cards** — one per extracted place, with:
   - Place name + category chip
   - Star rating (if available) + review count
   - Quoted snippet (how the creator described it)
   - Auto-tag chips (from `tags`)
   - Callout pills for dishes/activities (from `callouts`)
   - "More details" button → opens `PlaceDrawer` for this place
   - "Add to list" button → adds to the active list

Remove the existing `SourcesExportSheet` / "Export to list" footer flow — users now add places individually via the card CTAs.

**Depends on Slice B. `UserSocialSourcePlace` now includes `tags`, `callouts`, `google_rating`, `google_review_count`.**

---

## Files to read first

- `components/stitch/SourcesPanel.tsx` — current implementation (to replace)
- `lib/social/user-sources-contract.ts` — `UserSocialSourcePlace`, `UserSocialSourceRow` shapes
- `lib/state/useTripStore.ts` — `activeListId` (needed for "Add to list")
- `components/stitch/PlaceDrawer.tsx` — how it's opened (look for `focusedPlaceId` / `useDiscoveryStore`)
- `lib/state/useDiscoveryStore.ts` — confirm how to trigger PlaceDrawer for a given `place_id`
- `components/stitch/PersonaFilterChips.tsx` — chip visual pattern to reuse for tags/callouts
- `docs/DESIGN.md` — visual system reference (paper tokens, typography scale)

---

## Layout

```
┌─ SourcesPanel ──────────────────────────────────┐
│ [URL ingest input]                    [Add]      │ ← SocialUrlIngest (keep as-is)
├──────────────────────────────────────────────────┤
│ Source: [▼ "Bangkok Street Food — Mark Wiens"] │ ← dropdown, lists all ingested sources
│         YOUTUBE · @markwiens · foodie           │ ← meta line below dropdown
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │ Jeh O Chula                   Food  ★ 4.7   │ │ ← name + category chip + rating
│ │ "Best pad kra pao I had in Bangkok…"         │ │ ← snippet, 2-line clamp
│ │ [authentic] [street food] [cash only]        │ │ ← tag chips (auto)
│ │ 🍜 pad kra pao  🍜 boat noodles             │ │ ← callout pills (dish/activity)
│ │ [More details]           [+ Add to list]     │ │ ← CTAs
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ …next place card…                            │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Implementation

### Source dropdown

- A `<select>` (or custom button+popover if it fits the design system better) listing `source.title ?? source.url` for each `UserSocialSourceRow`
- Show platform badge and persona below the selector as a meta line
- Default: first source in the list
- When the active source changes, replace the place cards below

### Place card (`SourcePlaceCard`)

Props: `place: UserSocialSourcePlace`, `onMoreDetails: (placeId: string) => void`, `onAddToList: (placeId: string) => void`

**Rating display:**
- If `google_rating` is not null: show filled/empty stars (1 decimal, e.g. ★ 4.7) and `google_review_count` in parens if ≥ 1
- Use the same star rendering pattern as the existing list/drawer rating display (check `components/stitch/PlaceDrawer.tsx` or nearby for the helper)
- If no rating: omit the rating section entirely (don't show empty stars)

**Snippet:**
- Italic, 3-line clamp, paper-on-surface-variant color
- Wrap in `"…"` quotation marks

**Tag chips:**
- Only render if `tags.length > 0`
- Small `paper-chip` style (same as category chips)
- Non-interactive (display only)

**Callout pills:**
- Only render if `callouts.length > 0`
- Group by type: dishes use 🍽 prefix, drinks use 🥤, activities use 📍, tips use 💡
- Same chip style as tags but slightly different background (use `paper-chip-active` or a tinted variant)
- Non-interactive

**"More details" button:**
- Secondary/ghost style
- Calls `onMoreDetails(place.place_id)` → parent opens PlaceDrawer

**"Add to list" button:**
- Primary style (small)
- Disabled if no `activeListId` in `useTripStore`
- On click: `POST /api/lists/${activeListId}/items?place_id=${place.place_id}` with empty body
- Show brief loading state; on success show "Added ✓" for 2s then reset
- If already in list (409 response): show "Already added"

### Opening PlaceDrawer from "More details"

Look at how `ExploreShellPaper` opens the drawer for a clicked place. The pattern is setting `focusedPlaceId` in `useDiscoveryStore` (or equivalent). In `SourcesPanel`, import the store and call the same setter. The `SourcesShellPaper` (Slice D) will mount `PlaceDrawer` in overlay mode so it can render on top.

If `useDiscoveryStore` doesn't expose a simple `openPlaceDrawer(placeId)` action, use a local state lifted to `SourcesShellPaper` instead — pass `onMoreDetails` as a prop down to `SourcesPanel`.

### Remove

- `SourcesExportSheet` usage from `SourcesPanel`
- `useSourcesStore` (day index, tags, excluded state) — this whole local annotation layer is replaced by per-card "Add to list"
- The old accordion `SourceCard` / `SourcePlaceRow` components

Keep `SocialUrlIngest` at the top, unchanged.

---

## Empty / loading states

- Loading: skeleton (3 cards, same `SourcesSkeleton` pattern)
- No sources: "Paste a YouTube or blog URL above to get started"
- Source has no places: "No places extracted from this source"

---

## Definition of Done

- [ ] Source dropdown shows all ingested sources; switching updates place cards
- [ ] Place cards display name, category, rating (when present), snippet, tags, callouts
- [ ] "More details" opens PlaceDrawer for the selected place
- [ ] "Add to list" POSTs to the correct endpoint; shows feedback
- [ ] Old accordion + SourcesExportSheet removed
- [ ] `npm run check` passes
- [ ] `CONTEXT.md` updated: Slice C marked **Done** in the Sources Redesign status table
