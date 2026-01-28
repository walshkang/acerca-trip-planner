## Agent Quickstart
- Read `AGENTS.md` and `docs/VIBE_PLAYBOOK.md` before making changes.
- Invariants: DB is source of truth; only approved pins are truth; enrich once, read forever; strict taxonomy; user edits never overwrite frozen AI enrichment.
- DoD: tests updated/added; verification steps; migrations + `npm run db:types` if schema changed; no TODO placeholders in Decisions / Rationale or Next Steps.
- Pointers: `roadmap.json` for phases, `supabase/migrations` for schema, `docs/reports` for learning reports.

## 🧠 Active Context
- Current Phase: The Smart Repository (Cupcake)
- Active Epic: Strict Schema, Versioning & Deduplication
- Immediate Blocker: Task 1.4 – Generate Supabase DB Types.

## 🗺️ Roadmap Visualization

```mermaid
gantt
  dateFormat YYYY-MM-DD
  title AI_Travel_Itinerary_Manager
  section The_Smart_Repository_(Cupcake)
  "P1-E1 Strict Schema, Versioning & Deduplication" :active, p1e1, 2026-01-01, 7d
  "P1-E2 The Librarian Agent (Deterministic Ingestion)" :done, p1e2, after p1e1, 7d
  "P1-E3 Aligned Visual Interface" :done, p1e3, after p1e2, 7d
  "P1-E4 The Airlock (Visual Ingestion)" :done, p1e4, after p1e3, 7d
  "P1-E5 Map View + Discovery Refinements (Phase 0-4 Plan)" :p1e5, after p1e4, 7d
  section The_Interactive_Planner_(Birthday_Cake)
  "P2-E1 Stateful Planning (Kanban)" :p2e1, after p1e5, 7d
  "P2-E2 Deterministic Filtering & Intent Translation" :p2e2, after p2e1, 7d
  section The_Intelligent_Concierge_(Wedding_Cake)
  "P3-E1 Deterministic Routing" :p3e1, after p2e2, 7d
  "P3-E2 AI Discovery (Suggestion Layer)" :p3e2, after p3e1, 7d
```

## 📜 The Constitution
- LLMs label and translate intent; deterministic systems retrieve and compute.
- Only approved pins are truth (Map is the interface).
- Enrich Once, Read Forever (Frozen by default, versioned if refreshed).
- Strict Taxonomy: AI outputs must match UI Icon sets exactly.
- User edits never overwrite frozen AI enrichment.

## 📝 Implementation Memory
- 2026-01-27 – 🚧 CURRENT SESSION – Implement places_view + viewport persistence
    Added places_view migration with computed lat/lng, updated MapContainer to read from the view, regenerated types, and implemented fitBounds/load persistence + approval flyTo behavior.
- 2026-01-27 – chore: refine phase 2 planning + timezone strategy
    Auto-generated from git log (c0e7c86).
- 2026-01-27 – clean up extensions and supabase docs
    Auto-generated from git log (f5bef29).
