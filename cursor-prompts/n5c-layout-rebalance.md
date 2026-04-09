# N5c — Sources layout rebalance

## Goal

Sources is a research surface, not a map-first surface. Rebalance the desktop layout from roughly 50/50 (380px panel + flex-1 map) to **60% content / 40% map**. Mobile stays unchanged (panel only, map hidden).

**Model: Opus** — layout restructure of a complex component with overlay chips, research mode, and PlaceDrawer modal.

---

## The current layout (`SourcesShellPaper.tsx`)

```
┌─────────────────────────────────────────────────┐
│ PaperHeader (Sources tab active)                │
├──────────────┬──────────────────────────────────┤
│ SourcesPanel │ MapShell                         │
│   380px      │   flex-1 (remainder)             │
│   shrink-0   │   overlay list chips (top-left)  │
│              │   "Search this area" (bottom)     │
│              │   PlaceDrawer modal (z-70)        │
└──────────────┴──────────────────────────────────┘
```

**Problem:** On a 1440px screen, the panel is 380px (~26%) and the map takes ~74%. The panel is too narrow for enriched cards (N5a adds address, hours, directions) and video thumbnails (N5b). The map doesn't need that much space for source pin scouting.

---

## Target layout

```
┌─────────────────────────────────────────────────┐
│ PaperHeader (Sources tab active)                │
├──────────────────────────┬──────────────────────┤
│ SourcesPanel             │ MapShell             │
│   flex: 3 (≈60%)        │   flex: 2 (≈40%)     │
│   min-w-[380px]         │   min-w-[280px]      │
│   max-w-[640px]         │                      │
└──────────────────────────┴──────────────────────┘
```

---

## Changes to `components/app/SourcesShellPaper.tsx`

### Panel container (line 200)

Current:
```tsx
<div className={`${isMobile ? 'w-full' : 'w-full md:w-[380px] md:shrink-0'} min-h-0`}>
```

New:
```tsx
<div className={`${isMobile ? 'w-full' : 'w-full md:min-w-[380px] md:max-w-[640px] md:flex-[3]'} min-h-0`}>
```

### Map container (line 216)

Current:
```tsx
<div className="relative hidden min-h-0 min-w-0 flex-1 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed md:block">
```

New:
```tsx
<div className="relative hidden min-h-0 min-w-[280px] flex-[2] overflow-hidden rounded-[4px] border border-paper-tertiary-fixed md:block">
```

That's it. `flex-[3]` / `flex-[2]` gives the 60/40 split. `min-w` constraints prevent either side from collapsing on narrow desktop windows.

---

## What NOT to change

- Mobile layout — stays panel-only (`isMobile ? 'w-full'`), map hidden
- Overlay list chips, "Search this area" button — keep as-is, they're absolutely positioned inside the map container and will adapt
- PlaceDrawer modal — centered overlay, layout-independent
- `MapShell` props — no changes needed
- `SourcesPanel` internals — N5a/N5b handle card enrichment

---

## Verification

1. Desktop (≥768px): panel should visually take ~60% of the body, map ~40%
2. Resize browser to ~800px: both sides should respect minimums, no overlap or collapse
3. Panel scroll still works — enriched cards + video thumbnails have room to breathe
4. Overlay list chips in map still visible and clickable
5. "Search this area" button still centered in map area
6. PlaceDrawer modal still centers on screen
7. Mobile: no change — full-width panel, no map

---

## Files to touch

- `components/app/SourcesShellPaper.tsx` — two class string changes (lines 200 and 216)

## Do NOT touch

- `SourcesPanel.tsx` — N5a/N5b
- `MapShell.tsx`
- `PaperHeader.tsx`
