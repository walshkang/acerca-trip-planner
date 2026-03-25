# Map Controls & Overlay Settings

## What to build

1. Remove zoom in/out buttons from the map, keep only the "my location" button.
2. Wire the location button to actual browser geolocation.
3. Add a settings popover to the PaperHeader gear icon for toggling subway lines and neighborhood boundaries on the map.

## Files to modify

- `components/paper/PaperMapControls.tsx`
- `components/paper/PaperHeader.tsx`
- `components/app/ExploreShellPaper.tsx`

## Files to reference (read these first)

- `components/map/MapShell.tsx` — map ref handle, `showTransit`, `showTransitStations`, `showNeighborhoodBoundaries` props.
- `components/map/MapView.maplibre.tsx` — how transit lines, stations, and neighborhood boundaries are rendered as map layers.
- `DESIGN.md` — design tokens for popover styling.
- `/map/overlays/` — geojson files for subway lines, stations, and neighborhoods.

## Implementation steps

### 1. Remove zoom buttons from PaperMapControls

**File:** `components/paper/PaperMapControls.tsx`

Remove the zoom-in button (`add` icon) and zoom-out button (`remove` icon). Keep only the "my_location" button.

Remove `onZoomIn` and `onZoomOut` from props (they become unused).

Result should be a single floating button:
```tsx
export default function PaperMapControls({ onLocate, className = '', style }: PaperMapControlsProps) {
  const btn = 'flex h-12 w-12 items-center justify-center rounded-full border border-paper-tertiary-fixed bg-white shadow-sm transition-colors hover:bg-paper-surface-container'

  return (
    <div className={`absolute bottom-8 left-8 z-40 max-md:left-4 ${className}`.trim()} style={style}>
      <button type="button" className={btn} onClick={onLocate}>
        <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  )
}
```

### 2. Wire the location button to geolocation

**File:** `components/app/ExploreShellPaper.tsx`

Pass an `onLocate` callback to `PaperMapControls`:

```typescript
const handleLocate = useCallback(() => {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      mapShellRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 15,
      })
    },
    (err) => {
      console.warn('Geolocation error:', err.message)
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}, [])
```

Check if `MapShellHandle` exposes a `flyTo` method. If not, add one:

**File:** `components/map/MapShell.tsx`

Add `flyTo` to the imperative handle (the `useImperativeHandle` or `forwardRef` block):
```typescript
flyTo: (options: { center: [number, number]; zoom?: number }) => {
  mapRef.current?.flyTo(options)
}
```

The maplibre/mapbox `flyTo` method should already be available on the map instance.

### 3. Add settings popover to PaperHeader

**File:** `components/paper/PaperHeader.tsx`

The settings gear button (~line 29–33) currently does nothing. Make it functional:

1. Add new props to `PaperHeaderProps`:
   ```typescript
   showTransit?: boolean
   onShowTransitChange?: (value: boolean) => void
   showNeighborhoods?: boolean
   onShowNeighborhoodsChange?: (value: boolean) => void
   ```

2. Replace the static `HeaderActions` with a component that accepts these props.

3. On gear click: toggle a popover/dropdown below the button. Style with Paper tokens:
   ```
   ┌──────────────────────────┐
   │  Map Settings            │
   │                          │
   │  ☐ Show subway lines     │
   │  ☐ Show neighborhoods    │
   └──────────────────────────┘
   ```

4. Each row is a toggle switch or checkbox. Use simple `<input type="checkbox">` styled as toggle switches, or use the Paper chip active/inactive pattern.

5. Popover styling: `rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface shadow-lg p-3`. Position absolute below the gear button, right-aligned.

6. Click outside or press Escape to close. Use a simple `useEffect` with `mousedown` listener.

### 4. Wire settings state through ExploreShellPaper

**File:** `components/app/ExploreShellPaper.tsx`

1. Add state:
   ```typescript
   const [showTransit, setShowTransit] = useState(false)
   const [showNeighborhoods, setShowNeighborhoods] = useState(false)
   ```

2. Pass to PaperHeader:
   ```tsx
   <PaperHeader
     ...
     showTransit={showTransit}
     onShowTransitChange={setShowTransit}
     showNeighborhoods={showNeighborhoods}
     onShowNeighborhoodsChange={setShowNeighborhoods}
   />
   ```

3. Update MapShell props (currently hardcoded to `false` at ~lines 431–433):
   ```tsx
   <MapShell
     ...
     showTransit={showTransit}
     showTransitStations={showTransit}
     showNeighborhoodBoundaries={showNeighborhoods}
   />
   ```

   Note: `showTransitStations` follows `showTransit` — when subway lines are on, stations should be too.

## What NOT to do

- Don't add new map overlay data files — use the existing geojson in `/map/overlays/`.
- Don't change how the map layers are rendered — only toggle them on/off via the existing boolean props.
- Don't persist settings to the database or localStorage for now (state resets on page reload is fine).
- Don't modify the MapView rendering logic in `MapView.maplibre.tsx`.
- Don't touch the account_circle button — only make the settings button functional.
