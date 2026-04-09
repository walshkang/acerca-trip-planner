# Acerca — Product Roadmap (PRD)

Single source of truth for what we're building next. Each item is shaped enough to hand off; items marked "needs shaping" require a design pass before implementation.

For what's already shipped, see `CONTEXT.md`.

---

## Active — Next Up

### N1 — Search: stop showing active-list places when searching a new city

**Problem:** When searching for a place in a city you haven't been to, the Omnibox returns results from the active list (e.g., Tokyo places while searching for Bangkok). The `listScopeId` in `useDiscoveryStore` sends `list_id` to `/api/discovery/suggest`, which ranks local matches at score 2000 vs Google at 500. That's helpful when searching *within* an active list, but harmful when discovering new places.

**Appetite:** Small. 1–2 files.

**Approach (options — pick one):**
1. **Geographic filter** — if the search bias center is >200km from the nearest local match, don't send `list_id` (or score local matches at 0). Preserves in-list search when you're zoomed into the trip area.
2. **Drop list scope in Omnibox entirely** — Omnibox is always "explore mode" (no `list_id`); the in-list local search stays in `ListDetailPanel` where it already exists via `/api/places/local-search`. Simpler, but loses the "search my list from the header" convenience.

**Files:** `lib/state/useDiscoveryStore.ts` (~238–241), `lib/server/discovery/suggest.ts` (~198–301)

---

### N2 — Remove social source URLs from PlaceDrawer

**Problem:** When viewing a place on the map (PlaceDrawer), YouTube/blog source URLs appear. Those belong exclusively in Sources mode — the map drawer should show place info only.

**Appetite:** Small. 1 file, likely `PlaceDrawer.tsx`.

**Approach:** Find where social mention URLs render in `PlaceDrawer` and gate them behind the Sources context, or remove them entirely from the drawer. Source attribution lives in `SourcesPanel`.

---

### N3 — Transit layer loading spinner

**Problem:** GTFS vector tiles take time to load. The transit layer toggle gives no feedback, so the user thinks the layer is broken.

**Appetite:** Small. 1–2 files.

**Approach:** Show a subtle spinner next to the transit toggle (or on the map) while tiles are loading. Maplibre fires `sourcedata` / `sourcedataloading` events that can drive a loading state. No shimmer — just a spinner.

**Files:** Layer toggle UI (likely in `ToolsSheet.tsx` or `PaperMapControls`), plus a `sourcedata` listener in the maplibre view.

---

### N4 — Richer search result preview (reviews, directions)

**Problem:** After clicking a search result to evaluate a place, the preview shows name, address, and (via "More details") hours and Google types with website/Google Maps links. Missing: Google rating, review count, and a directions link.

**Appetite:** Medium. Touches the preview card + possibly the enrichment/Google details fetch.

**Approach:**
- **Rating + review count:** Already stored on `places` table (`google_rating`, `google_review_count` from Sources A migration). Check if the preview/enrichment flow populates these for search results — if not, pull from the Google Places API response which already returns them.
- **Directions link:** Add a "Directions" link that opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in a new tab. This is a static link — no API call needed. (See also N6 for in-app directions later.)

**Files:** `InspectorCard.tsx` or the preview section of `PlaceDrawer`, `lib/server/discovery/suggest.ts` (if enrichment data needs extending)

---

### N5 — Sources research hub: richer layout + enriched place info

**Problem:** Sources mode is functional but sparse. Place cards show name and snippet but lack the richness of a search result (rating, reviews, category, hours). The page is map-heavy with no room for media or research list management.

**Appetite:** Large. Layout rethink of `SourcesShellPaper`.

**Slices (implement in order):**

| Slice | What | Size |
|-------|------|------|
| N5a | **Enriched source place cards** — show the same info as search results: Google rating, review count, category, hours, directions link. Pull from `places` table (already enriched at ingest). | Medium |
| N5b | **Video thumbnails** — show YouTube thumbnail on source cards (or the source entry). Thumbnail URL is derivable from video ID (`https://img.youtube.com/vi/{id}/mqdefault.jpg`). Consider inline embed on click as a follow-up. | Small–Medium |
| N5c | **Layout rebalance** — reduce map footprint (e.g., 40% map / 60% content on desktop instead of current 50/50 split). Sources is a research surface, not a map-first surface. | Medium |
| N5d | **Research list management drawer** — new right-side drawer for managing research lists (create, rename, attach sources, vote summary). Source place cards stay on the left. Map in the middle or behind. | Large — needs further shaping |

**Constraint:** Source place cards must show the same data quality as `InspectorCard` / search preview. Don't build a second-class info display.

---

## Queued — Shaped but not next

### N6 — Directions button + multi-stop flow

**What:** A "Directions" button on places and in the planner that opens a directions view. For single destinations, this can link out to Google Maps. For multi-stop (e.g., a day's itinerary), use the Google Directions API to compute an optimized route.

**Needs shaping:**
- Multi-stop ordering: the Directions API charges per waypoint and has a 25-waypoint limit. For a 5-stop day, this is fine. For a full trip, need to chunk by day or limit to selected stops.
- In-app vs link-out: single stop → Google Maps link (free, zero API cost). Multi-stop → in-app with route polyline on the map (API cost, but valuable).
- Walking vs transit vs driving mode selection.

**Dependency:** N4 adds the single-place directions link as a quick win. N6 builds on that with multi-stop.

---

### N7 — Street View integration

**What:** Show Google Street View imagery for a place — either in the PlaceDrawer or as a modal/overlay. Useful for scouting a neighborhood before visiting.

**Status:** Noted. Cost and OSS alternatives to be researched separately before committing to a slice.

---

## Existing backlog (from CONTEXT.md, preserved)

- **Sources I** — list picker in `SourcesPanel` (choose target list for "Add to list"), social import path audit
- **Sources phase 2 (Curation + Compare)** — compare surface, snippet-rich cards, shortlist polish
- **TikTok import adapter (phase 3)** — additive expansion
- **Transit coverage S1–S5** — manual overrides + OSM fallback (paused)
- **In-app chat UI** — conversational trip planning wired to preview/commit APIs
- **Discover ↔ Plan map sync** — list selection flies Plan map to pins
- **Collab P4 (Realtime)** — Supabase Realtime + Presence
- **Insights layer** — distance warnings, closed-day alerts
- **PDF export, deeper integrations**
