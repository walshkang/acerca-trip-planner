# N1 — Stop showing active-list places when searching a new city

## Goal

When a user searches for a place far from their active list (e.g., searching for Bangkok while viewing a Tokyo trip), local list matches should not outrank Google results. Currently `list_id` is always sent to `/api/discovery/suggest`, and local matches score 2000 vs Google at 500, burying the actual search results.

**Model: Opus** — the scoring/ranking logic requires careful reasoning.

---

## Approach: Geographic filter on local scoring

When the search bias center is far (>200 km) from the nearest local match, score local results at 0 instead of 2000. This preserves in-list search when the map is zoomed into the trip area.

---

## `lib/server/discovery/suggest.ts` (~lines 255–301)

After `localCoordinates` is fetched (line 255), compute the minimum distance between the search bias center and any local place:

```ts
import { haversineDistanceKm } from '@/lib/geo/haversine' // already exists in the codebase
```

Before building `localWithRank` (line 283), check geographic proximity:

```ts
const biasCenter = canonical.lat != null && canonical.lng != null
  ? { lat: canonical.lat, lng: canonical.lng }
  : null

const LOCAL_PROXIMITY_THRESHOLD_KM = 200

const localPlacesAreNearby = biasCenter != null && filteredLocal.some((place) => {
  const coords = localCoordinates.get(place.id)
  if (!coords?.lat || !coords?.lng) return false
  return haversineDistanceKm(biasCenter.lat, biasCenter.lng, coords.lat, coords.lng) < LOCAL_PROXIMITY_THRESHOLD_KM
})
```

Then in the `localWithRank` mapping (line 301), change the score:

```ts
// Current:
score: canonical.list_id ? 2000 - index : 500 - index,

// New:
score: canonical.list_id
  ? (localPlacesAreNearby ? 2000 - index : 0)  // demote if searching far from list
  : 500 - index,
```

## `lib/state/useDiscoveryStore.ts` (~lines 233–247)

No changes needed here. The `listScopeId` and `searchBias` are already sent correctly. The fix is server-side only.

---

## Verification

1. Open a trip list with places in Tokyo
2. Pan the map to Bangkok and search "temple"
3. Results should show Bangkok temples from Google, not Tokyo temples from the list
4. Pan back to Tokyo and search — local matches should rank first again (within 200km)
5. Search without a list scope — behavior unchanged (local always at 500)

---

## Files to touch

- `lib/server/discovery/suggest.ts` — geographic proximity check + conditional scoring
- Check if `haversineDistanceKm` exists (likely in `lib/geo/` or `lib/import/compute.ts`). If not, add a small helper.

## Do NOT touch

- `useDiscoveryStore.ts` — no client changes needed
- Any UI components
