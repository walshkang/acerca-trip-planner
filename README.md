# 🗺️ AI-Assisted Contextual Itinerary Manager

A **local-first, map-centric travel planner** that turns scattered Google Maps saves into a structured, queryable, drag-and-drop itinerary.

Instead of juggling messy lists and half-remembered links, this project helps users overcome **Destination Paralysis** by organizing places into a personal database—so planning is based on *how you feel and what you want to do*, not just where things are.

This is **not** a conversational travel chatbot.
It is a **planning system** that uses AI sparingly, deterministically, and only where it adds durable value.

---

## 🧠 Core Philosophy: *Logic over Magic*

To keep costs low, behavior predictable, and trust high, the system follows a strict internal “constitution”:

### 1. Enrich Once, Read Forever (EORF)

When a place is added (e.g., *“Joe’s Pizza”*), it is enriched **one time** using external data sources and optional AI normalization.

That enrichment is **frozen and stored**.
All future queries, filters, and plans read only from the database.

The app never re-analyzes the same place at query time.

---

### 2. Map as Interface

The map is the source of truth.

If a place isn’t pinned on the map (or explicitly approved by the user), it does not exist in the system.
All planning, filtering, and routing operate only on this **local, user-approved dataset**.

---

### 3. Deterministic Planning

LLMs are used only to **label and normalize information**, never to calculate or decide.

* Distances, routing, and scheduling are handled by deterministic code and APIs
* The database performs all filtering and geospatial queries
* AI never performs live reasoning about places or itineraries

---

## 🧰 How We Build

- `AGENTS.md` is the single source of truth for invariants + DoD (humans and agents).
- `docs/VIBE_PLAYBOOK.md` is the execution checklist for every task.
- `CONTEXT.md` has the current phase, blockers, and pointers.
- `DESIGN.md` **Section B** describes the canonical **paper shell** (all viewports) and legacy glass layout.
- Use the PR template and run `npm run check` when possible.

---

## 📚 The Librarian Model (How Enrichment Works)

Place enrichment happens **only at ingestion time**, via a deterministic pipeline:

**Sources**

* **Google Places API** — location, coordinates, categories, hours
* **Wikipedia / Wikidata APIs** — historical context, descriptions, landmarks, structured facts

**Process**

1. Resolve the place via Places API
2. Fetch nearby Wikipedia pages via GeoSearch
3. Select the best match deterministically (distance + name similarity)
4. Pull structured data from Wikidata when available
5. *(Optional)* Use an LLM **once** to normalize fetched data into human-friendly tags (e.g., vibe, energy level)
6. Store the result permanently

After this step, **AI is no longer involved**.

---

## 🚫 Non-Goals

To prevent hallucination-driven UX and architectural drift, this project explicitly avoids:

* Real-time AI chat about places
* AI-generated recommendations without user approval
* Re-analyzing places during search or filtering
* LLM-based distance calculations or routing
* Treating external discovery results as truth without explicit user confirmation

---

## 🚀 Features Roadmap

Built progressively: **Cupcake → Wedding Cake**

---

### Phase 1: The Smart Repository (shipped) 🧁

A visual, structured database of saved places.

**Features**

* **AI-Assisted Librarian Ingestion**

  * Paste a Google Maps link or place name
  * Resolve via Places API
  * Enrich once using Places + Wikipedia/Wikidata
  * Normalize tags (e.g., *Vibe: Cozy*, *Energy: Low*)
  * Store permanently
* **Mapbox-First Interface**

  * Distinct pins for Coffee ☕, Food 🍜, Sights 📷, Shopping 🛍️
  * Map is the primary UI; list mirrors map state
* **Split View**

  * Interactive map
  * Place detail cards with factual context (Wikipedia summaries, photos)

**Current Execution Plan (Phase 0-4)**

* Phase 0 - Fix location serialization at the source (places_view + types)
* Phase 1 - Viewport logic (fitBounds + last view fallback)
* Phase 2 - Search architecture (cheap list -> heavy preview)
* Phase 3 - Preview + approval UX (preview-only Inspector, "Approve Pin")
* Phase 4 - Lists/plan persistence (lists schema + list UI)

---

### Phase 2: The Interactive Planner 🎂

Turn saved places into an actual plan via a **two-journey architecture**: Explore (map + discovery) and Plan (day grid + map inset).

**Features**

* **Two-Journey Architecture**
  * Explicit Explore / Plan mode switch via **PaperHeader** tabs (Map / Itinerary) on **all screen sizes**, with URL `?mode=` sync
  * `ExploreShellPaper`: full map, Omnibox, discovery, `PaperExplorePanel` (right rail on desktop, bottom sheet on phone)
  * `PlannerShellPaper`: `CalendarPlanner` plus Mapbox **MapInset** for spatial context
  * Shared state layer (`useTripStore`) keeps both journeys in sync
  * Legacy glass shells (`ExploreShell`, `PlannerShell`, `NavRail`, `NavFooter`) are not mounted from `AppShell` but may remain in the repo until removed

* **Day Grid Planner** (in `PlannerShellPaper` / `CalendarPlanner`)
  * Compact calendar-like grid: each trip day is a cell, rows of up to 7 days
  * Dateless trips supported via `day_index` (Day 1, Day 2, etc.)
  * Drag places between day cells or to/from a filterable backlog
  * Color-coded time-of-day hints (warm=morning, neutral=afternoon, cool=evening)
  * Desktop: grid overview on left + selected day detail on right
  * Mobile: compact grid with tap-to-move fallback

* **Map Inset** (in `PlannerShellPaper`)
  * Real Mapbox minimap with clickable pins colored by day assignment
  * Pin click scrolls to item in planner; day selection updates map bounds
  * Lightweight: no Omnibox, no discovery chrome

* **Deterministic Filtering**
  * Filter by category, vibe, or energy level
  * Compound AND/OR filters via filter JSON (no SQL from AI)

* **Cheap, Deterministic Time Handling**
  * “Open now” uses server time converted to place timezone
  * Timezone derived offline from lat/lng at ingestion; fallback to trip timezone

---

### Phase 3: The Intelligent Concierge (in progress) 💒

Routing, discovery suggestions, two-journey Explore/Plan UX — and planned list interchange.

**Shipped / in progress (see `roadmap.json`)**

* **Deterministic routing preview** — Server-side travel-time between scheduled items (e.g., OSRM adapter); badges in the planner when configured
* **AI discovery (suggestion layer)** — Deterministic retrieval first; optional summaries that do not affect ranking; preview/approve still gates persistence
* **Explore / Plan** — Separate shells, shared trip state; planner day grid with drag-and-drop (Map inset and polish items still on the roadmap)

**Planned (P3-E4 — list interchange)**

* **CSV export in the product** — List schedules exportable as CSV (and related formats); the authenticated export API already exists (`POST /api/lists/[id]/export`)
* **Import** — Rows resolved via Google Places + existing ingest/enrich/promote pipeline; preview → confirm before writes; optional round-trip id columns
* **Future** — In-app LLM outputs the same structured rows as file import, then the same deterministic import path

**Still aspirational / deferred**

* TSP-style route optimization for a day
* Weather and richer “insights” layers
* PDF or Notion-specific export beyond current formats

---

## 🛠️ Tech Stack

**Frontend**

* Next.js (React)
* Tailwind CSS

**Maps**

* Mapbox GL JS

**State & Drag-and-Drop**

* @dnd-kit/core, @dnd-kit/sortable

**Backend & Database**

* Supabase (PostgreSQL + PostGIS)

**Data Sources**

* Google Places API
* Wikipedia & Wikidata APIs

**AI / LLMs**

* OpenAI or Google Gemini
* Used **only** for one-time enrichment normalization via Edge Functions

---

## ✨ Why This Exists

Most travel apps optimize for *recommendations*.
This project optimizes for **decision-making**.

By grounding everything in a local dataset and using AI only where its output can be frozen and trusted, it creates a planning experience that is:

* predictable
* fast
* cost-efficient
* and genuinely useful

---

## 🧪 Learning Reports

This repo generates **learning plans/reports** to capture decisions and follow-ups for the team.

- Reports live in `docs/reports` and are committed for visibility.
- Keep Decisions / Rationale and Next Steps filled (no TODO placeholders).
