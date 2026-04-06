# Social Discovery S3.1 — Query RPC Migration

## What to build

A Supabase SQL migration that creates the `discover_social_places` RPC function. This powers the map UI — it returns places with their mention counts, aggregated personas, and top snippets, filterable by persona and viewport bounds.

No TypeScript. Just SQL.

## Files to create

- `supabase/migrations/YYYYMMDDHHMMSS_create_discover_social_places_rpc.sql` — use the next timestamp in sequence after the latest migration file

## Files to reference (read these first)

- `supabase/migrations/` — scan the latest files to get the current timestamp convention and see how existing RPCs are structured (e.g., `promote_candidate_to_place`)
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 3 spec has the full SQL draft
- The social schema migration (from S1) — verify table/column names for `social_sources`, `social_mentions`, `persona_enum`

## Implementation

```sql
-- discover_social_places: query social-discovered places with mention counts and persona filtering
CREATE OR REPLACE FUNCTION discover_social_places(
  p_persona persona_enum DEFAULT NULL,
  p_min_mentions INT DEFAULT 1,
  p_bounds GEOMETRY DEFAULT NULL
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  category category_enum,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  mention_count BIGINT,
  personas persona_enum[],
  top_snippets JSONB
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
        'platform', ss.platform,
        'sentiment', sm.sentiment
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
  ORDER BY mention_count DESC
  LIMIT 500;
$$ LANGUAGE sql STABLE;
```

**Key details:**
- `STABLE` — no side effects, safe for read replicas
- `LIMIT 500` — prevent runaway queries on large datasets
- `p_bounds` is optional `GEOMETRY` — pass `ST_MakeEnvelope(west, south, east, north, 4326)` from the client for viewport filtering
- `FILTER (WHERE sm.id IS NOT NULL)` — safety against left-join nulls (shouldn't happen with INNER JOIN but defensive)
- Sort `top_snippets` by newest first

## What NOT to do

- Don't add RLS policies to this function — it reads from `places` which already has RLS, and social places are readable by all authenticated users
- Don't add TypeScript wrapper code — that's a separate task (S3.2)
- Don't modify existing tables or functions

## Verification

After applying the migration locally (`supabase db push` or `supabase migration up`), test with raw SQL:

```sql
-- Should return empty (no data yet)
SELECT * FROM discover_social_places();

-- With persona filter
SELECT * FROM discover_social_places(p_persona := 'foodie');

-- With bounds (Bangkok area)
SELECT * FROM discover_social_places(
  p_bounds := ST_MakeEnvelope(100.3, 13.5, 100.8, 13.9, 4326)
);
```

Run `npm run db:types` after applying.
