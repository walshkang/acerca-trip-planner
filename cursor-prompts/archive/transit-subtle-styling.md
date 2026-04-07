# Transit overlay: subtle, per-type styling (Google Maps-inspired)

## Goal

Make the transit overlay look closer to Google Maps: **thinner lines, muted colors, per-transit-type differentiation, zoom-dependent visibility**. Remove the heavy casing layer. The result should feel like a subtle informational layer, not a bold overlay.

## Priority: open-source tile providers first

We use Carto (OpenMapTiles) and PMTiles (Protomaps) as our primary map providers. Mapbox is supported but we want to **minimize Mapbox API usage** to stay within the free tier. All three providers must work, but optimize the Carto/PMTiles experience first.

## What to change

### 1. `components/map/MapView.maplibre.tsx` — Carto + PMTiles rendering

Currently uses a single accent color `'#b933ad'` for all transit lines. Replace with **data-driven `match` expressions** per provider:

**Carto/OpenMapTiles** (`transportation` source-layer) — use `subclass` property:
```
['match', ['get', 'subclass'],
  'subway',       '#7B61A5',   // muted purple
  'light_rail',   '#5A9B8F',   // teal-gray
  'tram',         '#5A9B8F',   // teal-gray (same as light_rail)
  'rail',         '#8B8B8B',   // warm gray
  'narrow_gauge', '#8B8B8B',
  'funicular',    '#8B8B8B',
  'monorail',     '#8B8B8B',
  '#94a3b8'                    // fallback slate
]
```

**PMTiles/Protomaps** (`roads` source-layer) — use `pmap:kind` property:
```
['match', ['get', 'pmap:kind'],
  'subway',       '#7B61A5',
  'light_rail',   '#5A9B8F',
  'rail',         '#8B8B8B',
  '#94a3b8'
]
```

The MapView.maplibre.tsx component doesn't currently know which tile source it's using. Add an optional `transitColorField` prop to `TransitTileConfig` (see section 4) and use it to pick the right property name in the match expression.

### 2. `components/map/MapView.mapbox.tsx` — Mapbox rendering

Already has a `TRANSIT_LINE_COLOR` match expression using `['get', 'type']`. Update the colors to the same muted palette:
```typescript
const TRANSIT_LINE_COLOR = [
  'match',
  ['get', 'type'],
  'subway',       '#7B61A5',
  'rail',         '#8B8B8B',
  'tram',         '#5A9B8F',
  'light_rail',   '#5A9B8F',
  'monorail',     '#8B8B8B',
  'funicular',    '#8B8B8B',
  'narrow_gauge', '#8B8B8B',
  '#94a3b8',
] as const
```

### 3. Both MapView files — line styling changes

Replace the current paint props with subtler, zoom-dependent values:

**Transit lines paint** (replace current static values):
```typescript
paint={{
  'line-color': <match expression from above>,
  'line-width': [
    'interpolate', ['linear'], ['zoom'],
    8, 0.5,
    12, 1.5,
    16, 2.5,
  ],
  'line-opacity': [
    'interpolate', ['linear'], ['zoom'],
    8, 0.3,
    12, 0.55,
    16, 0.7,
  ],
}}
```

**Remove the casing layer entirely** (`transit-lines-casing`). Google Maps doesn't use casing on transit — it adds visual weight. Delete the `<Layer id="transit-lines-casing" .../>` component from both files.

**Transit stops paint** (keep but make subtler):
```typescript
paint={{
  'circle-color': '#7B61A5',
  'circle-radius': [
    'interpolate', ['linear'], ['zoom'],
    10, 1.5,
    14, 3,
    16, 4,
  ],
  'circle-opacity': [
    'interpolate', ['linear'], ['zoom'],
    10, 0,
    12, 0.6,
    16, 0.85,
  ],
  'circle-stroke-color': '#ffffff',
  'circle-stroke-width': 0.5,
}}
```

### 4. `components/map/MapView.types.ts` — extend TransitTileConfig

Add one field:
```typescript
export type TransitTileConfig = {
  vectorSource: string
  lineSourceLayer: string
  lineFilter: unknown[]
  stopSourceLayer?: string
  stopFilter?: unknown[]
  /** Property name for the transit-type color match (e.g. 'subclass', 'pmap:kind', 'type') */
  colorField?: string
}
```

### 5. `lib/map/styleResolver.ts` — add `colorField` to configs

```typescript
const MAPBOX_TRANSIT: TransitTileConfig = {
  vectorSource: 'composite',
  lineSourceLayer: 'road',
  lineFilter: ['in', 'class', 'major_rail', 'minor_rail', 'service_rail'],
  stopSourceLayer: 'transit_stop_label',
  stopFilter: ['in', 'mode', 'rail', 'metro_rail', 'light_rail', 'tram'],
  colorField: 'type',
}

const CARTO_VECTOR_TRANSIT: TransitTileConfig = {
  vectorSource: 'carto',
  lineSourceLayer: 'transportation',
  lineFilter: ['in', 'class', 'rail', 'transit'],
  colorField: 'subclass',
}

const PMTILES_TRANSIT: TransitTileConfig = {
  vectorSource: 'protomaps',
  lineSourceLayer: 'roads',
  lineFilter: ['in', 'pmap:kind', 'rail', 'light_rail', 'subway'],
  colorField: 'pmap:kind',
}
```

### 6. `components/map/MapShell.tsx` — remove casing props

Delete these lines (they're no longer used after removing the casing layer):
```
const transitCasingWidth = 4
const transitCasingOpacity = mapStyleMode === 'dark' ? 0.35 : 0.25
const transitCasingColor = mapStyleMode === 'dark' ? '#e2e8f0' : '#0f172a'
```

And remove these from the `<MapView>` props:
```
transitCasingWidth={transitCasingWidth}
transitCasingColor={transitCasingColor}
transitCasingOpacity={transitCasingOpacity}
```

Also remove `transitLineWidth` and `transitLineOpacity` props from MapShell (since the MapView now uses zoom-interpolated values internally, not props).

### 7. `components/map/MapView.types.ts` — remove unused props

Remove from `MapViewProps`:
- `transitLineWidth`
- `transitLineOpacity`
- `transitCasingWidth`
- `transitCasingColor`
- `transitCasingOpacity`

These are replaced by the zoom-interpolated expressions hardcoded in the MapView components.

### 8. `tests/map/styleResolver.test.ts` — update expected configs

Add `colorField` to every `transitTileConfig` expectation in the test file. The values match section 5 above.

## Files to modify

1. `components/map/MapView.types.ts` — add `colorField`, remove 5 casing/line props
2. `lib/map/styleResolver.ts` — add `colorField` to 3 configs
3. `components/map/MapView.maplibre.tsx` — data-driven colors via `colorField`, zoom paint, remove casing layer
4. `components/map/MapView.mapbox.tsx` — muted color palette, zoom paint, remove casing layer
5. `components/map/MapShell.tsx` — remove casing/line-width/opacity props
6. `tests/map/styleResolver.test.ts` — add `colorField` to expected configs

## Color reference (muted Google-inspired palette)

| Transit type | Color | Hex |
|---|---|---|
| Subway/metro | Muted purple | `#7B61A5` |
| Light rail / tram | Teal-gray | `#5A9B8F` |
| Rail / commuter | Warm gray | `#8B8B8B` |
| Narrow gauge / funicular / monorail | Warm gray | `#8B8B8B` |
| Fallback | Slate | `#94a3b8` |

## What NOT to do

- Don't add bus routes (not in the tile data)
- Don't add new source layers or fetch external data
- Don't change the `TransitTileConfig.lineFilter` values
- Don't modify the `PaperHeader` or layer toggle logic
- Don't change the `resolveMapStyle` return shape beyond adding `colorField`
