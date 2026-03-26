# Map Layer Toggle — Base Style Switcher

## What to build

A Google Maps-style layer toggle button on the map that lets users switch between base map styles: Default, Satellite, and Terrain. The selection syncs across MapView (explore) and MapInset (planner).

## Files to create

- `lib/state/useMapLayerStore.ts` — Zustand store for active layer

## Files to modify

- `components/map/MapShell.tsx` — subscribe to layer store, resolve style based on active layer
- `components/map/MapInset.tsx` — subscribe to same store, apply matching style
- `lib/map/styleResolver.ts` — add satellite + terrain style resolution
- `components/paper/PaperHeader.tsx` — add layer toggle UI to HeaderActions

## Files to reference (read these first)

- `lib/map/styleResolver.ts` — current style resolution logic, `resolveMapStyle()` function
- `components/map/MapShell.tsx` — how `resolveMapStyle` is called (line ~158–173), how `mapStyle` is passed to MapView
- `components/map/MapInset.tsx` — how it independently resolves style (line ~66–74), always uses `tone: 'light'`
- `components/app/ExploreShellPaper.tsx` — where `showTransit` state lives and is passed down
- `components/paper/PaperHeader.tsx` — existing settings popover in `HeaderActions` with transit/neighborhood checkboxes

## Implementation steps

### 1. Create `useMapLayerStore`

**File:** `lib/state/useMapLayerStore.ts`

```typescript
import { create } from 'zustand'

export type MapLayer = 'default' | 'satellite' | 'terrain'

type MapLayerState = {
  activeLayer: MapLayer
  setLayer: (layer: MapLayer) => void
}

export const useMapLayerStore = create<MapLayerState>((set) => ({
  activeLayer: 'default',
  setLayer: (layer) => set({ activeLayer: layer }),
}))
```

### 2. Extend `resolveMapStyle` to support satellite and terrain

**File:** `lib/map/styleResolver.ts`

Add a new parameter `layer` to `ResolveMapStyleInput`:

```typescript
export type MapLayer = 'default' | 'satellite' | 'terrain'

export type ResolveMapStyleInput = {
  provider: MapProvider
  tone: MapTone
  maplibreStyleSource?: string | null
  layer?: MapLayer  // NEW
}
```

Update `resolveMapStyle` to pick styles based on `layer`:

**Mapbox styles by layer:**
- `default` + light: `mapbox://styles/mapbox/light-v11` (existing)
- `default` + dark: `mapbox://styles/mapbox/navigation-night-v1` (existing)
- `satellite`: `mapbox://styles/mapbox/satellite-streets-v12` (ignore tone)
- `terrain` + light: `mapbox://styles/mapbox/outdoors-v12`
- `terrain` + dark: `mapbox://styles/mapbox/outdoors-v12` (same — no dark variant)

**MapLibre (Carto) styles by layer:**
- `default`: existing carto positron/dark-matter URLs
- `satellite`: Use a free satellite raster style. A good option:
  ```
  https://api.maptiler.com/maps/hybrid/style.json?key=get_a_free_key
  ```
  For now, if no MapTiler key is available, fall back to default with a console warning. Use env var `NEXT_PUBLIC_MAPTILER_KEY`.
- `terrain`: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` (Carto Voyager has terrain-like styling with topographic detail)

**PMTiles:** satellite and terrain are not available for PMTiles — fall back to default and log a warning.

Include `layer` in the `styleKey` so react-map-gl re-renders on layer change:
```typescript
styleKey: `${provider}:${tone}:${source}:${layer ?? 'default'}`
```

### 3. Add layer toggle to the existing settings popover

**File:** `components/paper/PaperHeader.tsx`

The `HeaderActions` component already renders a settings popover with transit and neighborhood checkboxes. Add the layer toggle above those checkboxes.

Add new props to `PaperHeaderProps`:
```typescript
activeLayer?: MapLayer
onLayerChange?: (layer: MapLayer) => void
```

In the popover content (inside the settings gear dropdown), add a layer picker section **above** the existing checkboxes:

```tsx
{/* Layer picker */}
<div className="mb-3 border-b border-paper-tertiary-fixed pb-3">
  <p className="mb-2 text-xs font-medium text-paper-secondary">Map type</p>
  <div className="flex gap-2">
    {(['default', 'satellite', 'terrain'] as const).map((layer) => (
      <button
        key={layer}
        type="button"
        onClick={() => onLayerChange?.(layer)}
        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
          activeLayer === layer
            ? 'border-paper-primary bg-paper-primary/10 text-paper-primary'
            : 'border-paper-tertiary-fixed text-paper-secondary hover:bg-paper-surface-container'
        }`}
      >
        <span className="material-symbols-outlined text-base">
          {layer === 'default' ? 'map' : layer === 'satellite' ? 'satellite_alt' : 'terrain'}
        </span>
        <span className="capitalize">{layer}</span>
      </button>
    ))}
  </div>
</div>
```

Style it to look like Google Maps' layer picker: small square buttons with icons, active state has a primary color border.

### 4. Wire the store through ExploreShellPaper

**File:** `components/app/ExploreShellPaper.tsx`

```typescript
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'

// Inside the component:
const { activeLayer, setLayer } = useMapLayerStore()
```

Pass to PaperHeader:
```tsx
<PaperHeader
  ...
  activeLayer={activeLayer}
  onLayerChange={setLayer}
/>
```

### 5. Subscribe to layer store in MapShell

**File:** `components/map/MapShell.tsx`

Import and use the store:
```typescript
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'

// Inside the component (around line 146):
const activeLayer = useMapLayerStore((s) => s.activeLayer)
```

Update the `resolveMapStyle` call (~line 158) to pass the layer:
```typescript
const { mapStyle, styleSource, styleKey, ... } = useMemo(
  () => resolveMapStyle({
    provider: mapProvider,
    tone: mapStyleMode,
    maplibreStyleSource: effectiveMaplibreStyleSource,
    layer: activeLayer,  // NEW
  }),
  [effectiveMaplibreStyleSource, mapProvider, mapStyleMode, activeLayer]
)
```

### 6. Subscribe to layer store in MapInset

**File:** `components/map/MapInset.tsx`

Same pattern:
```typescript
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'

// Inside the component:
const activeLayer = useMapLayerStore((s) => s.activeLayer)

const { mapStyle, styleKey } = useMemo(
  () => resolveMapStyle({
    provider: mapProvider,
    tone: 'light',
    maplibreStyleSource,
    layer: activeLayer,  // NEW
  }),
  [mapProvider, maplibreStyleSource, activeLayer]
)
```

## What NOT to do

- Don't remove the existing transit/neighborhood checkboxes — layer toggle is additive
- Don't change how overlay layers (transit lines, neighborhoods) are rendered
- Don't persist the layer preference to the database in this slice (that's a separate slice)
- Don't break the existing dark/light mode behavior — satellite/terrain override the base style, but dark/light still applies to markers and overlays
- Don't add transit as a layer option here — transit stays as the existing checkbox toggle. The layer toggle is for base map styles only.
