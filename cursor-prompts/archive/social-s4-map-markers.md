# Social Discovery S4.3 — Social Places on the Map (mention-scaled markers)

## What to build

Wire social places from `useSocialDiscoveryStore` into the map. Social places render using the same emoji pin system as user places, but marker size scales with `mention_count`. Also trigger the initial fetch on Explore mount.

## Files to modify

- `components/app/ExploreShellPaper.tsx` — fetch social places on mount, pass to MapShell
- `components/map/MapShell.tsx` — merge social places into the marker layer, apply size scaling
- `components/map/MapView.mapbox.tsx` — support `socialSize` prop on markers
- `components/map/MapView.maplibre.tsx` — same

## Files to reference (read these first)

- `lib/state/useSocialDiscoveryStore.ts` — `socialPlaces`, `fetchPlaces`, `isLoading` (S4.1)
- `components/map/MapShell.tsx` — read fully. Focus on the `places` state (line ~136), how `MapPlace[]` is built from `PlacesRow[]`, and how markers are passed to `MapView`.
- `components/map/MapView.types.ts` — `MapPlace` and `MapViewProps`. You'll extend `MapPlace` to carry `mentionCount`.
- `components/map/MapView.mapbox.tsx` and `MapView.maplibre.tsx` — look at how `Marker` components are rendered for each place. The size/className is applied there.
- `components/app/ExploreShellPaper.tsx` — where stores are initialized and where to add the `fetchPlaces` call on mount.

## Implementation steps

### 1. Extend `MapPlace` type in `MapView.types.ts`

Add optional field:
```typescript
export type MapPlace = {
  id: string
  name: string
  category: CategoryEnum
  lat: number
  lng: number
  mentionCount?: number    // social places only; undefined = user place
}
```

### 2. Fetch social places on mount in `ExploreShellPaper.tsx`

```typescript
import { useSocialDiscoveryStore, hydrateSocialStore } from '@/lib/state/useSocialDiscoveryStore'

// Inside the component:
const fetchSocialPlaces = useSocialDiscoveryStore((s) => s.fetchPlaces)
const socialPlaces = useSocialDiscoveryStore((s) => s.socialPlaces)

useEffect(() => {
  hydrateSocialStore()
  fetchSocialPlaces()
}, [fetchSocialPlaces])
```

### 3. Build `socialMapPlaces` in ExploreShellPaper and pass to MapShell

```typescript
const socialMapPlaces: MapPlace[] = socialPlaces.map((sp) => ({
  id: sp.place_id,
  name: sp.name,
  category: sp.category as CategoryEnum,
  lat: sp.lat,
  lng: sp.lng,
  mentionCount: sp.mention_count,
}))
```

Add a `socialPlaces` prop to `MapShellProps` and pass `socialMapPlaces` through.

### 4. Merge in MapShell, pass to MapView

In `MapShell.tsx`, after the existing `places` state, merge social places:

```typescript
const allPlaces = useMemo(() => {
  // Deduplicate: social place wins if same ID appears in both (shouldn't happen, but be safe)
  const userPlaceIds = new Set(places.map(p => p.id))
  const uniqueSocial = socialPlaces.filter(sp => !userPlaceIds.has(sp.id))
  return [...places, ...uniqueSocial]
}, [places, socialPlaces])
```

Pass `allPlaces` (not `places`) to `MapView`.

### 5. Size markers by mention count in MapView components

In both `MapView.mapbox.tsx` and `MapView.maplibre.tsx`, find where each place's `Marker` is rendered and apply size based on `mentionCount`:

```typescript
function markerSizeClass(mentionCount?: number): string {
  if (!mentionCount || mentionCount <= 1) return 'w-9 h-9'   // 36px — standard
  if (mentionCount <= 3) return 'w-11 h-11'                   // 44px
  return 'w-13 h-13'                                          // 52px
}
```

Apply this class to the marker's outer container div. The emoji inside scales naturally with the container.

Social markers should also show a subtle ring to distinguish them from user-saved places: add `ring-2 ring-amber-400/60` to the marker container when `mentionCount !== undefined`.

## What NOT to do

- Don't break existing user place rendering — social markers are additive
- Don't add click handlers for social places yet — the existing `onPlaceClick` fires for any place, and the drawer will show whatever data is in the DB. S4.4 adds the mentions section to the drawer.
- Don't add any transit or layer interactions — markers only
- Don't add the social marker size logic to `placeMarkerRing.ts` — it's separate from the scheduling ring system

## Verification

1. After running the S3.3 seed script, open the explore map
2. 8 Bangkok social pins appear alongside any user pins
3. Jay Fai and Thip Samai (2 mentions each) appear slightly larger than single-mention pins
4. Clicking a social pin opens the existing PlaceDrawer (S4.4 adds the mentions section)
5. Persona filter chips from S4.2 update which social pins appear on the map
