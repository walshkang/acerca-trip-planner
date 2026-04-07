# Cursor / Agent Prompts

Execution prompts for Cursor Composer and Claude agents. Each file is self-contained: it states what to build, which files to read first, and explicit implementation steps.

Shipped prompts live in `archive/`. Move a prompt there (and update this README) once its slice is confirmed working.

`agent_task.md` is a reusable preamble — reference it at the top of new agent prompts.

---

## Sources Research Workspace (active)

Use the current planning docs for active execution scope:
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` (S7-S10 section)
- `CONTEXT.md` (Immediate active items)

Legacy Sources Redesign A-D prompts are archived.

---

## Social Evals (active)

Use the eval flywheel docs for active work:
- `evals/scores/README.md`
- `CONTEXT.md` (Immediate active eval notes)

One-off implementation prompts for earlier eval slices are archived.

---

## Transit Coverage (paused)

| Prompt | Task | Status |
|--------|------|--------|
| `transit-coverage-s1.md` | Manual override bucket check in transit API route | TODO |
| `transit-coverage-s4.md` | OSM Overpass fallback | TODO |

---

## Archived (shipped) → `archive/`

| Prompt | What |
|--------|------|
| `B-preview-api.md` | Import preview API |
| `C-computed-fields.md` | Haversine, hours, slots, energy |
| `D-commit-api.md` | Import commit API |
| `F-export-ui.md` | CSV download button |
| `G-import-ui.md` | Upload/paste → preview → confirm wizard |
| `H-verification-gate.md` | Contract + compute + API tests |
| `map-layer-toggle.md` | Base style switcher (default/satellite/terrain) |
| `map-layer-persistence.md` | Layer pref → Supabase user_preferences |
| `transit-subtle-styling.md` | Per-type transit line styling |
| `discover-place-cards.md` | Place cards with ratings |
| `discover-drawer-cleanup.md` | Drawer cleanup |
| `discover-map-settings.md` | Map settings popover |
| `collab-share-ui.md` | Share link UI |
| `collab-async-sync.md` | Async sync via visibility-change |
| `social-s1-schema.md` | Schema: persona_enum, social_sources, social_mentions |
| `social-s2-extraction-contract.md` | Zod schema for LLM structured output |
| `social-s2-ingestion-api.md` | POST /api/enrichment/ingest-social orchestrator |
| `social-s3-query-rpc.md` | discover_social_places SQL function |
| `social-s3-rpc-wrapper.md` | TypeScript RPC wrapper |
| `social-s3-seed-data.md` | Dev seed script (Bangkok) |
| `social-s4-store.md` | useSocialDiscoveryStore Zustand store |
| `social-s4-persona-chips.md` | Persona toggle chips in PaperExplorePanel |
| `social-s4-map-markers.md` | Social pins merged into map, scaled by mention count |
| `social-s4-drawer-mentions.md` | "Mentioned by" section in PlaceDrawer |
| `social-s5-fetch-content.md` | POST /api/enrichment/fetch-content (YouTube + blog) |
| `social-s5-ingest-ui.md` | URL paste UI → fetch → ingest → map refresh |
| `slice2-calendar-grid.md` | CalendarPlanner week view (plan page rebuild) |
| `slice3-day-detail-and-drag.md` | Day detail panel + drag reorder |
| `slice4-view-toggles.md` | Week/day/list view toggles |
| `slice5-map-reposition-smart-dates.md` | Map reposition + smart date shifting |
| `sources-a-schema-pipeline.md` | Sources redesign A: schema + extraction pipeline |
| `sources-b-api-contract.md` | Sources redesign B: user-sources API contract |
| `sources-c-panel-ui.md` | Sources redesign C: SourcesPanel rich cards |
| `sources-d-desktop-shell-nav.md` | Sources redesign D: desktop split + tab nav |
| `e2e-test-rewrite.md` | Paper shell Playwright rewrite |
| `inspector-card-chip-refresh.md` | InspectorCard paper visual refresh |
| `eval-5-pipeline-perf-progress.md` | Social ingest performance + progress messages |
