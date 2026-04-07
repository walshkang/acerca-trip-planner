# Social Discovery Pipeline — Shape Up

> Async ingestion of social content (vlogs, blogs, TikToks) into structured place data, surfaced as persona-filtered hype signals on the map.

---

## Frame

**Problem:** Users discover places through social content — a YouTube vlog of Tokyo cafés, a TikTok of Bangkok street food, a blog post on "design hotels in Lisbon." Today they manually search and save each place. The signal of *who* recommended it and *how many creators* mentioned it is lost.

**Outcome:** A user pastes a transcript or URL. The system extracts places, resolves them to Google Place IDs, and stores who mentioned them and with what vibe. On the map, places glow proportionally to how many creators mentioned them. Toggle chips filter by persona — "show me only what the design/aesthetic people recommended."

**Appetite:** Medium bet. The proving ground is the LLM extraction → Google Places resolution pipeline. If that produces clean structured data, the rest is query plumbing and UI chips.

**Invariant — Logic over Magic:** AI runs strictly in the async ingestion pipeline (the "Librarian"). The map UI is driven entirely by deterministic Postgres queries and MapLibre layers. No LLM calls at render time.

---

## How it layers onto existing architecture

### What already exists (don't rebuild)

| Existing | Reuse for |
|----------|-----------|
| `places` table (PostGIS, dedup, categories) | Store social-discovered places — same table, new `source` value |
| `place_candidates` → enrichment → promote flow | Not used for social path — social places skip candidate staging (no user approval gate) |
| Google Places Text Search (`searchGooglePlaces`) | Resolve extracted place names to `google_place_id` + coordinates |
| `dedupe_key` (hash of name + geohash + address) | Prevent duplicate places from social ingestion |
| Map rendering (emoji pins, rings, focus states) | Social places render as normal pins; mention count drives size |
| `list_items` junction | Users "adopt" social places into their trip lists |

### What's new

| New | Purpose |
|-----|---------|
| `persona_enum` | Classify content creators: Local, Luxury, Budget, Design, Foodie, Adventure, Family, Nightlife |
| `social_sources` table | Content metadata — URL, platform, author, persona |
| `social_mentions` table | Join table: which source mentioned which place, with snippet context |
| `SOCIAL_SYSTEM_USER_ID` | Fixed UUID service account that owns all social-discovered places (solves RLS scoping) |
| `POST /api/enrichment/ingest-social` | Ingestion endpoint: transcript in → structured places out |
| `discover_social_places` RPC | Query layer: mention counts, persona filtering, aggregated snippets |

### The user-scoping decision

Current `places` table is user-scoped (RLS: `auth.uid() = user_id`). Social places have no single owner.

**Decision: System User (Option C).** A fixed UUID service account owns all social-ingested places. RLS works as-is — no schema change needed. When a real user wants to plan with a social place, they add it to their list via existing `list_items`. The map renders social places alongside user places via a view/RPC that unions both.

Why not a separate table: duplicates schema, map rendering logic, and the dedup system. The `places` table already has PostGIS, categories, enrichment hooks, and dedup — reuse all of it.

---

## Slices

### Slice 1 — Schema: `social_sources`, `social_mentions`, `persona_enum`

**Migration creates:**

```sql
-- Enum
CREATE TYPE persona_enum AS ENUM (
  'local', 'luxury', 'budget', 'design',
  'foodie', 'adventure', 'family', 'nightlife'
);

-- Content metadata
CREATE TABLE social_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'blog', 'instagram', 'reddit', 'other')),
  author_name TEXT NOT NULL,
  author_persona persona_enum NOT NULL,
  title TEXT,               -- video/post title if available
  raw_transcript TEXT,      -- full transcript for re-processing
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url)              -- same URL can't be ingested twice
);

-- Join table: source ↔ place with context
CREATE TABLE social_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES social_sources(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  snippet TEXT NOT NULL,     -- the quote/context where place was mentioned
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'mixed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, place_id)  -- one mention per source-place pair
);

CREATE INDEX social_mentions_place_id_idx ON social_mentions(place_id);
CREATE INDEX social_mentions_source_id_idx ON social_mentions(source_id);
CREATE INDEX social_sources_platform_idx ON social_sources(platform);
CREATE INDEX social_sources_persona_idx ON social_sources(author_persona);
```

**RLS:** `social_sources` and `social_mentions` are server-only (service role writes, public reads). Authenticated users can SELECT but not INSERT/UPDATE/DELETE.

**System user:** Add `SOCIAL_SYSTEM_USER_ID` to `.env` — a pre-created Supabase auth user whose UUID is stable across environments. Social-ingested places get `user_id = SOCIAL_SYSTEM_USER_ID` and `source = 'social'`.

**Gates:** Migration runs clean, `npm run db:types` regenerates, no existing tests broken.

---

### Slice 2 — Ingestion API: `POST /api/enrichment/ingest-social`

**The flow:**

```
Transcript + metadata
  → LLM structured extraction (persona + mentioned places)
  → Google Places Text Search (resolve each place name)
  → Supabase upserts (places, social_sources, social_mentions)
```

**Request shape:**
```typescript
{
  url: string;            // source URL (dedup key)
  platform: 'tiktok' | 'youtube' | 'blog' | ...;
  author_name: string;
  title?: string;
  transcript: string;     // raw text content
  location_hint?: {       // city-level bias for Google Places search
    lat: number;
    lng: number;
    city?: string;
  };
}
```

**LLM call** (structured output, JSON schema enforced):
```typescript
{
  author_persona: persona_enum;
  mentioned_places: Array<{
    place_name: string;
    place_type?: string;      // "café", "temple", "hotel" — helps Google resolve
    context_snippet: string;  // exact quote where mentioned
    sentiment: 'positive' | 'neutral' | 'mixed';
  }>;
}
```

**Resolution loop** (for each extracted place):
1. Call `searchGooglePlaces(place_name, location_hint)` — reuse existing function
2. Take top result → extract `place_id`, `name`, `formatted_address`, `geometry`
3. Upsert into `places` with `user_id = SOCIAL_SYSTEM_USER_ID`, `source = 'social'`, `source_id = 'google:{place_id}'`
4. ON CONFLICT (dedupe_key or source+source_id) → do nothing (place already known)

**Upsert order:** `social_sources` → `places` (per extracted place) → `social_mentions` (link each)

**Auth:** Service role only (no user auth). Protected by API key or internal-only flag. This is a backend pipeline, not user-facing.

**Error handling:** Partial success is fine — if 8/10 places resolve, store those 8. Log failures for the 2 that didn't resolve.

**Gates:** Unit test with mocked LLM response + mocked Google Places response. Verify upsert idempotency (same URL twice = no duplicates).

---

### Slice 3 — Query layer: `discover_social_places` RPC

**Supabase RPC or view that powers the map:**

```sql
CREATE OR REPLACE FUNCTION discover_social_places(
  p_persona persona_enum DEFAULT NULL,
  p_min_mentions INT DEFAULT 1,
  p_bounds GEOMETRY DEFAULT NULL  -- optional viewport bounding box
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  category category_enum,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  mention_count BIGINT,
  personas persona_enum[],
  top_snippets JSONB        -- [{author_name, snippet, platform}, ...]
) AS $$
  SELECT
    p.id AS place_id,
    p.name,
    p.category,
    ST_Y(p.location::geometry) AS lat,
    ST_X(p.location::geometry) AS lng,
    COUNT(DISTINCT sm.id) AS mention_count,
    ARRAY_AGG(DISTINCT ss.author_persona) AS personas,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'author_name', ss.author_name,
        'snippet', sm.snippet,
        'platform', ss.platform
      ) ORDER BY sm.created_at DESC
    ) FILTER (WHERE sm.id IS NOT NULL) AS top_snippets
  FROM places p
  JOIN social_mentions sm ON sm.place_id = p.id
  JOIN social_sources ss ON ss.id = sm.source_id
  WHERE p.source = 'social'
    AND (p_persona IS NULL OR ss.author_persona = p_persona)
    AND (p_bounds IS NULL OR ST_Within(p.location::geometry, p_bounds))
  GROUP BY p.id, p.name, p.category, p.location
  HAVING COUNT(DISTINCT sm.id) >= p_min_mentions
  ORDER BY mention_count DESC;
$$ LANGUAGE sql STABLE;
```

**Gates:** Call from SQL directly with test data. Verify persona filtering, mention count threshold, snippet aggregation.

---

### Slice 4 — Map UI: persona chips + mention-scaled markers

**Explore mode additions:**

1. **Persona toggle chips** — horizontal scroll row below the omnibox (same pattern as existing category filter chips). Each chip = one `persona_enum` value. Multi-select. Default: all on.

2. **Mention-scaled markers** — social places render with the same emoji pin system, but marker size scales with `mention_count`:
   - 1 mention: standard 36px
   - 2–3 mentions: 44px
   - 4+ mentions: 52px + subtle glow ring

3. **Map data source** — new `useSocialDiscoveryStore` (Zustand) holds:
   - `selectedPersonas: Set<persona_enum>`
   - `socialPlaces: SocialPlace[]` (from RPC)
   - `isLoading`, `error`
   
   MapShell fetches social places via RPC on mount + when persona filters change. Social places merge with user places in the marker layer.

4. **Mention sidebar** — when user clicks a social place pin, the PlaceDrawer shows a "Mentioned by" section below the existing place details:
   - List of mentions: `{author_name} on {platform}: "{snippet}"`
   - Persona badge on each mention

**Skip for now:** hype glow animations, heat map overlay, batch URL ingestion UI. These are separate bets.

**Gates:** Persona chips toggle correctly. Marker sizes scale with mention count. PlaceDrawer shows mentions. No regression on existing place rendering.

---

## Risks & rabbit holes

| Risk | Mitigation |
|------|------------|
| LLM extracts wrong place names → bad Google matches | Location hint (city-level lat/lng) dramatically improves resolution. Accept partial failures — 80% accuracy is fine for v1. |
| Google Places API costs per resolution | Batch: one source with 10 places = 10 API calls. Rate limit the ingestion endpoint. Cache resolved `google_place_id` → place data to avoid re-resolving. |
| Social places pollute user's personal map | Social places owned by system user — they only appear on the social discovery layer, not in user's "my places" list. Users explicitly adopt via `list_items`. |
| Persona classification is subjective | v1: LLM classifies per-source, not per-mention. One author = one persona. Good enough to prove the filter UX works. Revisit multi-persona if needed. |
| RLS complexity with system user | System user places are readable by all authenticated users via a permissive SELECT policy. No write access except service role. Clean separation. |

---

---

## Execution Plan

### Agent assignments

| Task | Prompt | Agent | Blocks |
|------|--------|-------|--------|
| S1 — Schema migration | `cursor-prompts/social-s1-schema.md` | **Claude Opus** | Everything |
| S1 — `npm run db:types` | (manual) | **You** | S2.1, S3.2 |
| S2.1 — Extraction contract (Zod) | `cursor-prompts/social-s2-extraction-contract.md` | **Claude Sonnet** | S2.2, S4.1 |
| S2.2 — Ingestion API route | `cursor-prompts/social-s2-ingestion-api.md` | **Claude Opus** | S2.4 |
| S2.4 — Ingestion unit tests | (in S2.2 prompt) | **Claude Sonnet** | — |
| S3.1 — Query RPC migration | `cursor-prompts/social-s3-query-rpc.md` | **Claude Opus** | S3.2, S3.3 |
| S3.2 — TypeScript RPC wrapper | `cursor-prompts/social-s3-rpc-wrapper.md` | **Claude Sonnet** | S4.1 |
| S3.3 — Seed script | `cursor-prompts/social-s3-seed-data.md` | **Claude Sonnet** | S4 (all) |
| S4.1 — Zustand store | `cursor-prompts/social-s4-store.md` | **Cursor** | S4.2, S4.3 |
| S4.2 — Persona filter chips | `cursor-prompts/social-s4-persona-chips.md` | **Cursor** | — |
| S4.3 — Map markers (scaled) | `cursor-prompts/social-s4-map-markers.md` | **Cursor** | S4.4 |
| S4.4 — PlaceDrawer mentions | `cursor-prompts/social-s4-drawer-mentions.md` | **Cursor** | — |

### Parallel execution

```
S1 (Opus) ──────────────────────────────────────────────────────────────────────
  ↓ db:types (you, ~5 min)
  ├─ S2.1 (Sonnet) → S2.2 (Opus) → S2.4 (Sonnet)
  └─ S3.1 (Opus) → S3.2 (Sonnet) → S3.3 (Sonnet) → S4.1 → S4.2 + S4.3 → S4.4
                                                     ↑
                                      Cursor unblocked after seed data
```

S2 (ingestion) and S3 (query) are independent after S1 — run them in parallel with two agents.
All S4 tasks unblock once S3.3 seed data is in place — Cursor can iterate on UI without real ingestion.

## What this is NOT

- **Not a scraper.** The pipeline accepts pre-extracted transcripts/text. Content fetching (YouTube transcript API, TikTok scraping) is a separate concern, outside this bet.
- **Not real-time.** Ingestion is async, triggered manually or by a future cron job. The map reads from Postgres, not a live stream.
- **Not a recommendation engine.** The system structures and surfaces social signals. It doesn't rank or personalize. The user filters by persona and reads the snippets.

---

## Sources Research Workspace — Shape Up

> A focused flow for comparing social sources, identifying overlapping place mentions, and triaging them into actionable trip lists.

---

## Frame

**Problem:** The social ingestion pipeline successfully extracts places from content. However, users cannot easily answer "Which places show up across multiple vlogs?" or efficiently triage these suggestions into a real itinerary.

**Outcome:** A dedicated `research` list type where users attach ingested sources. The system renders a deterministically ranked list of places based on source overlap. Users can filter by map viewport ("Search this area"), use a forum-style +/- voting system to curate noise, and move consensus picks to a `trip` list.

**Appetite:** Medium bet. The AI extraction pipeline is already proven and running. This phase is focused on Postgres schema extensions, RPC query modifications, and frontend UI/UX.

**Invariant — Logic over Magic:** The DB and map are the source of truth. The AI's job ends at ingestion. Ranking, overlap, and filtering stay deterministic. User triage actions (votes) never destructively mutate frozen AI enrichment data.

---

## How it layers onto existing architecture

### What already exists (don't rebuild)

| Existing | Reuse for |
|----------|-----------|
| `social_sources` and `social_mentions` | Core ingested data queried for overlap analysis. |
| `lists` and `list_items` | Destination when users choose "Add to Trip". |
| `SOCIAL_SYSTEM_USER_ID` | RLS owner for underlying social-discovered places. |
| Map bounding state | Viewport coordinates for "Search this area" spatial filter. |
| Multi-user collab (P1-P3) | Existing anonymous join + realtime sync patterns for research lists. |

### What's new

| New | Purpose |
|-----|---------|
| `lists` (alteration) | Add `list_type: 'trip' | 'research'`. |
| `list_sources` table | Junction binding attached `social_sources` to a specific `research` list. |
| `research_votes` table | Per-user +/- votes on places within a research list. |
| `discover_research_places` RPC | Deterministic overlap query scoped to `list_id`, spatial bounds, and votes. |

### Contract notes (resolved)

- **Starring semantics:** `is_starred` is scoped to `list_sources` only (starred source within a research list). It is not added to `lists` in this bet.
- **Vote lifecycle:** `research_votes.vote_value` stores only `-1` or `1`. Clearing a vote deletes that user's row for `(list_id, place_id, user_id)`.
- **User identity:** `research_votes.user_id` is UUID only. Anonymous collaboration must provide UUID session IDs.
- **Deterministic ordering:** sort by `overlap_count DESC`, `net_score DESC`, `place_id ASC` as stable tie-break.
- **Spatial contract:** `p_bounds` expects SRID 4326 geometry for map viewport filtering.

---

## Slices (Phase 1: MVP)

### Slice 7 — Schema: Journey Split and Curation State

**Migration creates:**

```sql
-- Alter existing lists
ALTER TABLE lists
ADD COLUMN list_type text NOT NULL DEFAULT 'trip'
CHECK (list_type IN ('trip', 'research'));

-- Join table: which sources are attached to this research list?
CREATE TABLE list_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES social_sources(id) ON DELETE CASCADE,
  is_starred boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, source_id)
);

-- Curation state: forum-style voting
CREATE TABLE research_votes (
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, place_id, user_id)
);

CREATE INDEX list_sources_list_id_idx ON list_sources(list_id);
CREATE INDEX research_votes_list_place_idx ON research_votes(list_id, place_id);
```

**Gates:** Migration runs clean, `npm run db:types` regenerates, and existing list/trip tests remain green.

---

### Slice 8 — Query Layer: `discover_research_places` RPC

**RPC contract powering the workspace:**

```sql
CREATE OR REPLACE FUNCTION discover_research_places(
  p_list_id UUID,
  p_bounds GEOMETRY DEFAULT NULL
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  overlap_count BIGINT,
  net_score BIGINT,
  user_vote SMALLINT,
  top_snippets JSONB
) AS $$
  -- Logic:
  -- 1) Resolve source_ids attached to p_list_id via list_sources
  -- 2) Join social_mentions and places
  -- 3) Apply p_bounds filter when provided (SRID 4326)
  -- 4) Compute overlap_count as COUNT(DISTINCT source_id)
  -- 5) Left join research_votes for net_score + current user's user_vote
  -- 6) Order by overlap_count DESC, net_score DESC, place_id ASC
$$ LANGUAGE sql STABLE SECURITY INVOKER;
```

**Gates:** RPC returns the expected schema. Bounds filtering works correctly. Voting aggregations and current-user vote resolution are correct under RLS.

---

### Slice 9 — UI: Triage and Spatial Querying

1. **Search this area:** Wire `MapShell` viewport bounds to Zustand state. When the map moves, show "Search this area". Clicking calls `discover_research_places` with `p_bounds`.
2. **+/- voting:** Place cards render up/down controls. Click upserts `-1` or `1` into `research_votes`. Clearing vote deletes the row. Net-negative places are visually de-emphasized.
3. **Marker scaling:** Marker prominence scales by `overlap_count` (for example, mentioned in 3 sources means larger pin).

---

### Slice 10 — "Add to Trip" Mutation

**Golden path:**
1. User clicks "Add to Trip" on a place card in the research workspace.
2. A sheet lists available `trip` lists.
3. RPC/server action creates a `list_items` record in the target trip list.
4. Bonus: include top `social_mentions` context in `list_items.notes` so provenance survives transfer.

---

## Risks and rabbit holes

| Risk | Mitigation |
|------|------------|
| Map visual clutter | Enforce spatial bounding through "Search this area"; avoid rendering global pin floods by default. |
| Destructive vs soft curation | `research_votes` stores reversible triage state; no updates to canonical `places` or `social_mentions`. |
| Realtime vote conflicts | Composite PK `(list_id, place_id, user_id)` ensures idempotent per-user vote writes under collaboration. |

---

## Execution plan

### Agent assignments

| Task | Tier | Scope |
|------|------|-------|
| S7 — Schema migration and types | **Deep** | Implement `lists`, `list_sources`, `research_votes` schema changes and run `npm run db:types`. |
| S8 — Query RPC implementation | **Deep** | Implement `discover_research_places` with bounds + vote aggregations and validate ordering. |
| S9 — Map bounds and voting UI | **Bounded** | Build "Search this area", +/- interactions, and Zustand wiring. |
| S10 — Add-to-Trip mutation | **Bounded** | Build trip-list selector sheet and `list_items` write path. |

### Parallel execution

- **Deep tier** completes S7 and S8 first.
- After RPC and regenerated types are available, **Bounded tier** executes S9 and S10 in parallel (mocking RPC responses if needed until backend wiring lands).
