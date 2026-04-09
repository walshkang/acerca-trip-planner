# N3 — Transit layer loading spinner

## Goal

GTFS vector tiles take time to load. When the user toggles the transit layer, there's no feedback — it looks broken until tiles appear. Add a subtle spinner while transit tiles are loading.

**Model: Sonnet** — mechanical wiring of a maplibre event to a boolean state.

---

## Approach

1. Add a `transitLoading` boolean to `useMapLayerStore`
2. Listen to maplibre `sourcedata` / `sourcedataloading` events in the map view
3. Show a spinner in `PaperHeader` next to the transit toggle button

---

## `lib/state/useMapLayerStore.ts`

Add to the store state:

```ts
transitLoading: boolean
setTransitLoading: (loading: boolean) => void
```

Default `transitLoading: false`. Simple setter.

---

## `components/map/MapView.maplibre.tsx`

After the map instance is available, listen for GTFS source loading events. The transit tile source ID is needed — grep for how transit sources are added (likely via `addSource` or a style layer referencing a pmtiles/vector source).

```ts
// When activeLayer === 'transit', listen for tile loading:
map.on('sourcedataloading', (e) => {
  if (e.sourceId === /* transit source id */) {
    setTransitLoading(true)
  }
})

map.on('sourcedata', (e) => {
  if (e.sourceId === /* transit source id */ && e.isSourceLoaded) {
    setTransitLoading(false)
  }
})
```

Also set `transitLoading` to `false` when `activeLayer` changes away from `'transit'`.

---

## `components/paper/PaperHeader.tsx`

Import `useMapLayerStore` and read `transitLoading`.

Next to the transit layer button (around line 132 where `onLayerChange(layer)` is called for the transit option), show a small spinner when `transitLoading && activeLayer === 'transit'`:

```tsx
{layer === 'transit' && transitLoading && activeLayer === 'transit' ? (
  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
) : null}
```

Or use a simple CSS spinner — keep it subtle. No shimmer, no skeleton. Just a small rotating icon next to the label.

---

## Verification

1. Toggle transit layer on — spinner should appear briefly while tiles load
2. Spinner disappears once tiles render
3. Toggle transit off and back on — spinner appears again during reload
4. Switch to terrain layer — no spinner
5. On a slow connection (throttle in DevTools), spinner should be visible for longer

---

## Files to touch

- `lib/state/useMapLayerStore.ts` — add `transitLoading` + `setTransitLoading`
- `components/map/MapView.maplibre.tsx` — listen for `sourcedataloading` / `sourcedata` events
- `components/paper/PaperHeader.tsx` — render spinner next to transit toggle

## Do NOT touch

- `PaperMapControls.tsx` — not the right place for this
- `ExploreShellPaper.tsx` — state flows through the store, no prop drilling needed
