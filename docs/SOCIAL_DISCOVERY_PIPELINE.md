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

## What this is NOT

- **Not a scraper.** The pipeline accepts pre-extracted transcripts/text. Content fetching (YouTube transcript API, TikTok scraping) is a separate concern, outside this bet.
- **Not real-time.** Ingestion is async, triggered manually or by a future cron job. The map reads from Postgres, not a live stream.
- **Not a recommendation engine.** The system structures and surfaces social signals. It doesn't rank or personalize. The user filters by persona and reads the snippets.
