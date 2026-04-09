# N6a — "Directions for this day" button in PlannerShellPaper

## Goal

When a user selects a day in the CalendarPlanner, they can click **"Directions"** to open a free Google Maps multi-stop route for all places scheduled that day — in slot order (morning → afternoon → evening). No API cost: this is pure URL construction.

**Model: Sonnet** — small change, no schema work, 1–2 files.

---

## Context

`PlannerShellPaper.tsx` already has everything needed:
- `mapPlaces: MapPlace[]` — all list places with lat/lng (fetched from `places_view`)
- `activeListItems: TripListItem[]` — scheduling state per place (`scheduled_date`, `scheduled_start_time`, `place_id`)
- `plannerSelectedDay: string | null` — currently focused day (ISO date)

`CalendarDayDetail` / `CalendarPlanner` don't have lat/lng — don't thread coords through them. Build the URL at the shell level.

---

## Implementation

### `components/app/PlannerShellPaper.tsx`

#### 1. Add a helper (module scope)

```ts
/**
 * Build a Google Maps multi-stop directions URL for a set of ordered stops.
 * Returns null if fewer than 1 stop has coordinates.
 * Up to 25 stops (Google Maps web limit).
 */
function buildDayDirectionsUrl(
  orderedPlaceIds: string[],
  mapPlaces: MapPlace[]
): string | null {
  const coordMap = new Map(mapPlaces.map((p) => [p.id, p]))
  const stops = orderedPlaceIds
    .map((id) => coordMap.get(id))
    .filter((p): p is MapPlace => p != null)
    .slice(0, 25)
  if (stops.length === 0) return null
  if (stops.length === 1) {
    const s = stops[0]!
    return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
  }
  const origin = stops[0]!
  const destination = stops[stops.length - 1]!
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|')
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base
}
```

#### 2. Derive ordered place IDs for the selected day

Add a memo below the existing `mapPlaces` state:

```ts
const dayDirectionsUrl = useMemo(() => {
  if (!plannerSelectedDay) return null
  const dayItems = activeListItems
    .filter((item) => item.scheduled_date === plannerSelectedDay)
  if (!dayItems.length) return null
  // Sort by scheduled_start_time (null/unscheduled goes last)
  const sorted = [...dayItems].sort((a, b) => {
    if (a.scheduled_start_time == null && b.scheduled_start_time == null) return 0
    if (a.scheduled_start_time == null) return 1
    if (b.scheduled_start_time == null) return -1
    return a.scheduled_start_time.localeCompare(b.scheduled_start_time)
  })
  return buildDayDirectionsUrl(sorted.map((i) => i.place_id), mapPlaces)
}, [plannerSelectedDay, activeListItems, mapPlaces])
```

#### 3. Render the button

Place this as an `<a>` tag near the MapInset container, inside the `xl:w-[350px]` div that wraps it:

```tsx
{dayDirectionsUrl ? (
  <div className="px-1 pb-1 flex justify-end">
    <a
      href={dayDirectionsUrl}
      target="_blank"
      rel="noreferrer"
      className="paper-button-ghost px-2 py-1 text-xs"
    >
      Directions for this day ↗
    </a>
  </div>
) : null}
```

Position: directly **above** the `<div data-onboarding="map-inset" ...>` that wraps `<MapInset />`. The button only renders when `plannerSelectedDay` is set and at least one scheduled place has coordinates.

---

## Verification

1. Navigate to Planner mode with a list that has ≥2 places on one day
2. Click that day in the calendar grid → `plannerSelectedDay` is set
3. A "Directions for this day ↗" link appears above the MapInset
4. Click it → opens Google Maps with a multi-stop route (all stops for that day, in time order)
5. A day with 0 places or 1 place: link either shows a single-destination URL (1 place) or is absent (0 places)
6. Switching to a day with no scheduled places → link disappears
7. No change to CalendarDayDetail, CalendarPlanner, or MapInset

---

## Files to touch

- `components/app/PlannerShellPaper.tsx` — add helper, memo, render button

## Do NOT touch

- `CalendarDayDetail.tsx` — no lat/lng needed there
- `CalendarPlanner.tsx` — no changes
- `MapInset.tsx` — visual changes are N6b
- `lib/routing/` — that's for in-app OSRM routing (N6b)
