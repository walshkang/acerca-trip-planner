# Cursor / Agent Prompts

Execution prompts for Cursor Composer and Claude agents. Each file is self-contained: it states what to build, which files to read first, and explicit implementation steps.

Shipped prompts live in `archive/`. Move a prompt there (and update this README) once its slice is confirmed working.

`agent_task.md` is a reusable preamble — reference it at the top of new agent prompts.

---

## Sources Redesign (active — run A → B → C → D)

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `sources-a-schema-pipeline.md` | Migration: tags/callouts on social_mentions, ratings on places; update Gemini extraction | **Cursor** | — |
| `sources-b-api-contract.md` | Update `list_user_social_sources()` RPC + TypeScript contract | **Cursor** | A + db:types |
| `sources-c-panel-ui.md` | SourcesPanel redesign: source dropdown, rich place cards, Add to list | **Cursor** | B |
| `sources-d-desktop-shell-nav.md` | Desktop split layout, Sources tab nav fix, map pins per source | **Cursor** | C |

**Run strictly in order. Each slice depends on the previous.**

---

## E2E Test Rewrite (active)

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `e2e-test-rewrite.md` | Rewrite 12 stale Playwright specs against paper shell; delete workspace-adaptive, add paper-shell-responsive | **Cursor** | — |

---

## Social Evals (active — run 2 → 3 → 4 → 5)

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `eval-2-deterministic-harness.md` | Golden fixture harness with deterministic schema + sentinel checks | **Cursor** | — |
| `eval-3-llm-judge.md` | Semantic judge eval with recall/hallucination/vibe rubric | **Cursor** | 2 |
| `eval-4-runner.md` | Scripts + gating + docs for eval execution | **Cursor** | 2 + 3 |
| `eval-5-pipeline-perf-progress.md` | Ingest perf improvements + progress message UX | **Cursor** | 2 + 3 |

---

## Visual Refresh (active — runs parallel to Sources A–D)

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `inspector-card-chip-refresh.md` | InspectorCard: paper chip/button/input/surface styles, drop glass + isDark | **Cursor** | — |

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
