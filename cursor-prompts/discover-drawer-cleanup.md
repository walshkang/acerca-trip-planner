# Discover Drawer Cleanup & Restructure

## What to build

Simplify the discover page right-hand drawer: remove clutter, move list creation to the header, restructure type/tag filtering into the panel chrome, and remove redundant sections.

## Files to modify

- `components/stitch/ListDrawer.tsx`
- `components/stitch/ListDetailBody.tsx`
- `components/paper/PaperExplorePanel.tsx`
- `components/app/PlannerListSwitcher.tsx`
- `components/app/ExploreShellPaper.tsx`

## Files to reference (read these first)

- `DESIGN.md` — design tokens, typography, color system.
- `lib/icons/useCategoryIconOverrides.ts` — hook for per-list emoji overrides. Reuse in PaperExplorePanel.
- `components/ui/EmojiPicker.tsx` — existing emoji picker component.
- `lib/types/enums.ts` — `CATEGORY_ENUM_VALUES`, `CategoryEnum`.
- `lib/icons/preferences.ts` — `CATEGORY_ICON_CHOICES` for suggested emojis.

## Implementation steps

### 1. Remove "Keep the map in view" subtitle

**File:** `components/stitch/ListDrawer.tsx` (~line 857–861)

Delete the `<p>` element that says "Keep the map in view." inside the drawer header. Keep the `<h2>Lists</h2>` heading.

### 2. Move "Create new list" to PlannerListSwitcher

**File:** `components/app/PlannerListSwitcher.tsx`

Add a "Create new list" button after the existing list tabs:

1. Add a "+" button (or "New list" text button) styled with `bg-paper-primary text-paper-on-primary` to visually distinguish it from the list tab buttons.
2. On click: show a small inline popup or dropdown with:
   - Input field: "List name" placeholder
   - "Create" button (disabled if empty)
3. On submit: `POST /api/lists` with `{ name }`. On success:
   - Add the new list to local state
   - Call `selectList(newList.id)` to switch to it
   - Close the popup
4. Desktop: the "+" button sits at the end of the tab row.
5. Mobile: add to the dropdown menu as a "Create new list" option that expands an inline input.

**File:** `components/stitch/ListDrawer.tsx` (~lines 885–934)

Remove the create-list section (the `<div>` containing the "New list name" input, "Create" button, list loading/error states, and the list selection chips). The `hideListSelectionChips` prop is already true in the Paper Explore context, so the chips were hidden anyway. The create-list input is now in PlannerListSwitcher.

Keep the `fetchLists`, `createList` functions and their state — move the create logic to PlannerListSwitcher (it already fetches lists independently via `GET /api/lists`).

### 3. Remove date subtitle from explore panel header

**File:** `components/app/ExploreShellPaper.tsx` (~line 480)

Change:
```typescript
subtitle={activeListId ? panelSubtitle : null}
```
To:
```typescript
subtitle={null}
```

You can also remove the `panelSubtitle` memo (~lines 195–202) since it's no longer used.

### 4. Remove the Filters box and PlaceType section from ListDetailBody

**File:** `components/stitch/ListDetailBody.tsx` (~lines 580–840)

Delete the entire `{showFilters ? ... : null}` block. This removes:
- The "Filters" panel with Draft/Applied status
- The filter intent translator (natural language → filters)
- The selected filter chips row
- The "Place type" subsection with category chips
- The "Tags" subsection with tag chips

The type filter chips in `PaperExplorePanel` panel chrome already handle type filtering. Tags will be added there next.

Also remove the `showFilters` computed boolean and related variables (`isTypeFiltering`, `hasAnyDraftFilters`, `selectedFilterChips` memo) if they become unused.

**Important:** Keep all the filter-related props on ListDetailBody — they're still used by the parent to sync state. Just don't render the filter UI.

### 5. Move "Type icons" editor to PaperExplorePanel as "Change emojis"

**File:** `components/stitch/ListDetailBody.tsx` (~lines 453–533)

Remove the "Type icons (this list)" editor panel from the list summary card.

**File:** `components/paper/PaperExplorePanel.tsx`

Add a "Change emojis" option below the type filter chips:

1. Add new props to `PaperExplorePanelProps`:
   ```typescript
   activeListId?: string | null
   onEmojiChange?: (category: CategoryEnum, emoji: string | null) => void
   ```
2. Inside the component, use the `useCategoryIconOverrides(activeListId)` hook.
3. Below the filter chips row, add a small link:
   ```
   Change emojis ▾
   ```
   Styled as `text-[11px] text-paper-on-surface-variant hover:text-paper-primary cursor-pointer`.
4. On click: toggle an expanded panel showing each category with its current emoji and a "Change" button. Reuse the same pattern from the deleted ListDetailBody code.
5. Include the `EmojiPicker` component at the bottom.

**File:** `components/app/ExploreShellPaper.tsx`

Pass `activeListId` to `PaperExplorePanel`.

### 6. Add Tags under Types with subheadings

**File:** `components/paper/PaperExplorePanel.tsx`

Restructure the filter chips area into two labeled subsections:

```
TYPES
[🍽 Food] [☕ Coffee] [🏛 Sights] [🛍 Shop] [🎯 Activity] [🍸 Drinks]
Change emojis ▾

TAGS
[#date-night] [#must-try] [#rooftop] ...
```

1. Add new props:
   ```typescript
   tags?: { id: string; label: string; active?: boolean }[]
   onTagChange?: (tagId: string) => void
   ```
2. Render "Types" subheading (`text-[10px] font-bold uppercase tracking-[0.2em] text-paper-on-surface-variant`) above the existing type filter chips.
3. Render "Tags" subheading with the same styling below the type chips + "Change emojis" link.
4. Render tag chips with the same `paper-chip` / `paper-chip-active` classes used by type chips.

**File:** `components/app/ExploreShellPaper.tsx`

Wire tag data from the ListDrawer to PaperExplorePanel:
- The ListDrawer already exposes `onActiveTypeFiltersChange` — follow the same pattern for tags.
- Add state: `activeListTags: string[]`, `activeListTagFilters: string[]`
- Build tag chip objects and pass to PaperExplorePanel.
- On tag chip click: toggle the tag filter (follow the same pattern as `onTypeFilterChange`).

### 7. Remove dates from list summary card

**File:** `components/stitch/ListDetailBody.tsx` (~lines 445–447)

Remove the `{rangeLabel ? ... : null}` block that shows "Dates: start → end". Also remove the `rangeLabel` memo and the `formatDateRange` function if they become unused.

## What NOT to do

- Don't remove filter state management from ListDrawer — only remove the filter UI rendering.
- Don't change how the PaperExplorePanel mobile bottom sheet works.
- Don't touch the PlaceDrawer or InspectorCard components.
- Don't modify the API routes — this is all client-side UI work.
- Don't remove the `EmojiPicker` component from `ListDetailBody.tsx` — move the pattern to `PaperExplorePanel.tsx` instead.
