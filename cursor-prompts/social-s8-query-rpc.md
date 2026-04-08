# Sources Research Workspace S8 — Query RPC: `discover_research_places`

## Prerequisite

S7 must be applied and `npm run db:types` must have run before this slice is tested. The migration references `list_sources`, `research_votes`, `social_mentions`, and `social_sources` — all created in S7 or earlier.

## What to build

A Supabase SQL migration that creates the `discover_research_places` RPC. This function powers the research workspace: given a `list_id`, it returns places from attached social sources, ranked by how many of those sources mention each place, with vote aggregations and optional viewport filtering.

No TypeScript. Just SQL.

## Files to create

- `supabase/migrations/20260410000002_create_discover_research_places_rpc.sql`

## Files to reference (read these first)

- `supabase/migrations/20260406000002_create_discover_social_places_rpc.sql` — sister RPC; follow the same SQL style
- `supabase/migrations/20260410000001_create_research_workspace_schema.sql` — table definitions for `list_sources` and `research_votes`
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 8 spec (search for "Slice 8")

## Implementation

```sql
-- discover_research_places: overlap-ranked places for a research list
-- Scoped to sources attached to p_list_id via list_sources.
-- Aggregates per-user vote (user_vote) and net score across all users.
-- Optional p_bounds filters by map viewport (SRID 4326).

CREATE OR REPLACE FUNCTION discover_research_places(
  p_list_id UUID,
  p_bounds GEOMETRY DEFAULT NULL
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  category category_enum,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  overlap_count BIGINT,
  net_score BIGINT,
  user_vote SMALLINT,
  top_snippets JSONB
) SECURITY INVOKER LANGUAGE sql STABLE AS $$
  WITH attached_sources AS (
    -- Resolve which source_ids are attached to this list
    SELECT source_id
    FROM list_sources
    WHERE list_id = p_list_id
  ),
  place_overlap AS (
    -- For each place, count how many distinct attached sources mention it
    SELECT
      sm.place_id,
      COUNT(DISTINCT sm.source_id)                     AS overlap_count,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'author_name', ss.author_name,
          'snippet',     sm.snippet,
          'platform',    ss.platform,
          'sentiment',   sm.sentiment
        ) ORDER BY sm.created_at DESC
      ) FILTER (WHERE sm.id IS NOT NULL)               AS top_snippets
    FROM social_mentions sm
    JOIN attached_sources a ON a.source_id = sm.source_id
    JOIN social_sources ss  ON ss.id = sm.source_id
    GROUP BY sm.place_id
  ),
  vote_agg AS (
    -- Net score across all users; current user's individual vote
    SELECT
      place_id,
      COALESCE(SUM(vote_value), 0)                     AS net_score,
      MAX(vote_value) FILTER (WHERE user_id = auth.uid()) AS user_vote
    FROM research_votes
    WHERE list_id = p_list_id
    GROUP BY place_id
  )
  SELECT
    p.id                                               AS place_id,
    p.name,
    p.category,
    ST_Y(p.location::geometry)                         AS lat,
    ST_X(p.location::geometry)                         AS lng,
    po.overlap_count,
    COALESCE(va.net_score, 0)                          AS net_score,
    va.user_vote,
    po.top_snippets
  FROM place_overlap po
  JOIN places p ON p.id = po.place_id
  LEFT JOIN vote_agg va ON va.place_id = po.place_id
  WHERE
    (p_bounds IS NULL OR ST_Within(p.location::geometry, p_bounds))
  ORDER BY
    po.overlap_count DESC,
    COALESCE(va.net_score, 0) DESC,
    p.id ASC          -- stable tie-break
  LIMIT 500;
$$;
```

**Key details:**
- `SECURITY INVOKER` — RLS on `list_sources` and `research_votes` enforces that only list members see results
- `auth.uid()` inside `vote_agg` resolves the caller's own vote; returns `NULL` for anonymous callers (no vote cast)
- `STABLE` — no side effects; safe for read replicas
- `LIMIT 500` — guards against unbounded result sets
- Stable three-key sort: `overlap_count DESC, net_score DESC, place_id ASC`

## What NOT to do

- Don't modify `discover_social_places` — this is a new, separate function
- Don't add RLS policies to this function — `SECURITY INVOKER` delegates to table-level RLS
- Don't add TypeScript wrapper code — that's part of S9

## Verification

After applying the migration locally, test with raw SQL (substitute a real `list_id`):

```sql
-- Should return empty if no sources are attached to the list
SELECT * FROM discover_research_places('00000000-0000-0000-0000-000000000001');

-- With viewport bounds (Tokyo area)
SELECT * FROM discover_research_places(
  '00000000-0000-0000-0000-000000000001',
  ST_MakeEnvelope(139.6, 35.5, 139.9, 35.8, 4326)
);
```

Run `npm run db:types` after applying. Run `npm test` — no existing tests should break.

## Update CONTEXT.md

Mark S8 as **Done** in the Sources Research Workspace slice table.
