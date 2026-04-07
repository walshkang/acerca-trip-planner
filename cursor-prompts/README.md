# Cursor / Agent Prompts

Execution prompts for Cursor Composer and Claude agents. Each file is self-contained: it states what to build, which files to read first, and explicit implementation steps.

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

## Social Discovery S5 (active)

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `social-s5-fetch-content.md` | `POST /api/enrichment/fetch-content` — YouTube transcript + blog extraction | **Cursor** | — |
| `social-s5-ingest-ui.md` | URL paste input in ExplorePanel → fetch → ingest → map refresh | **Cursor** | S5a |

**Run S5a first. S5b unblocks once fetch-content endpoint exists.**

---

## Social Discovery Pipeline (shipped S1–S4)

Full spec: `docs/SOCIAL_DISCOVERY_PIPELINE.md`

| Prompt | Task | Agent | Depends on |
|--------|------|-------|------------|
| `social-s1-schema.md` | Schema migration: `persona_enum`, `social_sources`, `social_mentions` | **Claude Opus** | — |
| `social-s2-extraction-contract.md` | Zod schema for LLM structured output + request validation | **Claude Sonnet** | S1 + db:types |
| `social-s2-ingestion-api.md` | `POST /api/enrichment/ingest-social` orchestrator | **Claude Opus** | S2.1 |
| `social-s3-query-rpc.md` | `discover_social_places` SQL function migration | **Claude Opus** | S1 |
| `social-s3-rpc-wrapper.md` | TypeScript wrapper for the RPC | **Claude Sonnet** | S3.1 + db:types |
| `social-s3-seed-data.md` | Dev seed script (Bangkok social places) | **Claude Sonnet** | S3.1 |
| `social-s4-store.md` | `useSocialDiscoveryStore` Zustand store | **Cursor** | S2.1, S3.2 |
| `social-s4-persona-chips.md` | Persona toggle chips in PaperExplorePanel | **Cursor** | S4.1 |
| `social-s4-map-markers.md` | Merge social pins into map, scale by mention count | **Cursor** | S4.1 |
| `social-s4-drawer-mentions.md` | "Mentioned by" section in PlaceDrawer | **Cursor** | S4.3 |

**Run S1 first. After `npm run db:types`, S2.x and S3.x can run in parallel.**

---

## Transit Coverage (paused)

| Prompt | Task | Status |
|--------|------|--------|
| `transit-coverage-s1.md` | Manual override bucket check in transit API route | TODO |
| `transit-coverage-s4.md` | OSM Overpass fallback | TODO |

---

## Archived (shipped)

Previous P3-E4 prompts (B–H) are complete. Prompt files remain for reference.
`docs/archive/PHASE_3_LIST_INTERCHANGE.md` has the full spec.

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
