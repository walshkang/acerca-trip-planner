# Slice C: Server-Computed Fields

## What to build

Pure deterministic functions that compute spatial, temporal, and energy-based warnings for preview rows. These get wired into the preview API response.

## Files to create

- `lib/import/compute.ts` — all pure functions
- `tests/import/compute.test.ts` — unit tests

## Files to modify

- `app/api/lists/[id]/import/preview/route.ts` — wire computed fields into PreviewRow responses

## Files to reference (read these first)

- `lib/import/contract.ts` — `ComputedFields`, `SLOT_TIME_RANGE`, `ResolvedEnrichment`, `TripSummary` types.
- `docs/PHASE_3_LIST_INTERCHANGE.md` — full spec for each computed field.
- `lib/lists/planner.ts` — `PlannerSlot`, `PLANNER_SLOT_SENTINEL_TIME`.

## Functions to implement in `lib/import/compute.ts`

### 1. `parseGoogleOpeningHours(hours: string[]): ParsedHours[]`

Google returns hours like `"Monday: 9:00 AM – 10:00 PM"` or `"Monday: Closed"`.

```typescript
type ParsedHours = {
  day: number      // 0=Sunday, 1=Monday, ... 6=Saturday
  open: number     // minutes from midnight (e.g. 540 = 9:00 AM)
  close: number    // minutes from midnight (e.g. 1320 = 10:00 PM)
  closed: boolean
}
```

Parse each string. Handle `Closed`, `Open 24 hours`, and `HH:MM AM/PM` formats. Return empty array if parsing fails.

### 2. `isOpenDuringSlot(hours: string[] | null, date: string, slot: PlannerSlot): boolean | null`

- If `hours` is null → return null (unknown).
- Parse hours, find the entry for the day-of-week of `date`.
- Check if the slot's time range (from `SLOT_TIME_RANGE` in contract.ts) overlaps with the opening hours.
- Slot ranges: morning 8:00–12:00, afternoon 12:00–17:00, evening 17:00–22:00.

### 3. `haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number`

Standard haversine formula. Return distance in kilometers, rounded to 2 decimal places.

### 4. `estimateWalkingMinutes(distanceKm: number): number`

`Math.round(distanceKm / 5 * 60)` — assuming 5 km/h walking speed.

### 5. `computeFieldsForDay(rows: Array<{ resolved: ResolvedEnrichment | null; input: ImportRow }>): ComputedFields[]`

For a single day's worth of rows (sorted by slot: morning → afternoon → evening):

- **distance_from_previous_km**: haversine from previous resolved row's coords. null for first row or if either row is unresolved.
- **travel_time_minutes**: `estimateWalkingMinutes(distance)`. null if distance is null.
- **open_during_slot**: call `isOpenDuringSlot` if row has scheduled_date and scheduled_slot.
- **slot_conflict**: true if another row in the same day has the same scheduled_slot.
- **energy_sequence**: array of energy levels from first item to current item (e.g. `["High", "High", "Medium"]`). Only include resolved rows.

### 6. `computeTripSummary(rows: PreviewRow[], tripStart?: string, tripEnd?: string): TripSummary`

- **total_days**: count unique scheduled_dates across ok rows.
- **empty_slots**: if tripStart and tripEnd provided, enumerate every date in range × every slot (morning, afternoon, evening). Find combos with no scheduled ok row.
- **warnings**: generate strings like:
  - `"Day 2026-04-02 has no morning activity"`
  - `"3 consecutive high-energy items on 2026-04-01"`
  - `"Chatuchak Weekend Market may be closed during the morning slot on 2026-04-01"`
  - `"25 min walk between Wat Pho and Chatuchak Weekend Market"`

## Wiring into preview route

After building all `PreviewRow` objects in the preview route:

1. Group ok rows by `scheduled_date`.
2. For each day group, sort by slot rank (morning=0, afternoon=1, evening=2).
3. Call `computeFieldsForDay(dayRows)` → assign `computed` on each `PreviewRow`.
4. Call `computeTripSummary(allRows, trip_start_date, trip_end_date)` → set on response.

## Test cases for `tests/import/compute.test.ts`

- `haversineDistanceKm`: known pairs (e.g. Bangkok Wat Pho to Chatuchak ≈ 13.5km).
- `isOpenDuringSlot`: open during slot → true, closed → false, no hours → null, "Open 24 hours" → true.
- `parseGoogleOpeningHours`: normal hours, "Closed", "Open 24 hours", malformed input.
- `computeFieldsForDay`: 3 items same day, verify distances chain, slot conflicts detected, energy sequence builds.
- `computeTripSummary`: 3-day trip with gaps → correct empty_slots.

## What NOT to do

- Don't call external APIs. All functions are pure — they operate on data already fetched by the preview route.
- Don't use real-time transit APIs. Walking estimate is sufficient for v1.
- Don't modify the contract types — they're already defined.
