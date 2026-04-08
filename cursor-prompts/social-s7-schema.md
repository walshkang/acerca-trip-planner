# Sources Research Workspace S7 — Schema: Journey Split and Curation State

## What to build

A single Supabase migration that extends the schema to support the Sources Research Workspace MVP:

1. `lists.list_type` column — `'trip'` (default, existing behavior) or `'research'` (new workspace type)
2. `list_sources` — junction table binding ingested `social_sources` to a specific research list
3. `research_votes` — per-user +/- curation votes scoped to a `(list_id, place_id)` pair

No UI. No API routes. No TypeScript changes (those come after `npm run db:types`).

## Files to create

- `supabase/migrations/20260410000001_create_research_workspace_schema.sql`

## Files to reference (read these first)

- `supabase/migrations/20260406000001_create_social_discovery_schema.sql` — `social_sources` table structure and RLS patterns
- `supabase/migrations/20260326000002_create_list_shares_and_collaborators.sql` — junction table and index style used elsewhere
- `supabase/migrations/20240125000004_create_lists.sql` — existing `lists` schema before alteration
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 7 spec (search for "Slice 7")

## Migration content

```sql
-- Sources Research Workspace — Schema Layer
-- Adds list_type to lists, list_sources junction, and research_votes.

-- ─── 1. Journey split: trip vs research lists ───

ALTER TABLE lists
ADD COLUMN list_type text NOT NULL DEFAULT 'trip'
CHECK (list_type IN ('trip', 'research'));

-- ─── 2. list_sources: which sources are attached to a research list ───

CREATE TABLE list_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES social_sources(id) ON DELETE CASCADE,
  is_starred boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, source_id)
);

CREATE INDEX list_sources_list_id_idx ON list_sources(list_id);

ALTER TABLE list_sources ENABLE ROW LEVEL SECURITY;

-- List owners and collaborators can read
CREATE POLICY "List members can read list_sources"
  ON list_sources FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    list_id IN (
      SELECT id FROM lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid()
    )
  );

-- List owners can insert/delete their attached sources
CREATE POLICY "List owners can manage list_sources"
  ON list_sources FOR ALL
  USING (
    list_id IN (SELECT id FROM lists WHERE user_id = auth.uid())
  );

-- ─── 3. research_votes: per-user +/- votes on places within a research list ───

CREATE TABLE research_votes (
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, place_id, user_id)
);

CREATE INDEX research_votes_list_place_idx ON research_votes(list_id, place_id);

ALTER TABLE research_votes ENABLE ROW LEVEL SECURITY;

-- All list members can read votes (for net score display)
CREATE POLICY "List members can read research_votes"
  ON research_votes FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    list_id IN (
      SELECT id FROM lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can only write their own votes
CREATE POLICY "Users can manage their own research_votes"
  ON research_votes FOR ALL
  USING (user_id = auth.uid());
```

## What NOT to do

- Don't remove or modify existing columns on `lists` — `list_type` is additive only
- Don't add a write policy to `social_sources` — the social pipeline uses service role
- Don't create the `discover_research_places` RPC here — that's S8
- Don't add TypeScript wrapper code — regenerate types first, wire up in S9/S10

## After applying

1. Run `npm run db:types` to regenerate `lib/supabase/types.ts`
2. Verify `list_sources` and `research_votes` appear in types
3. Verify `lists` has `list_type` field in the generated type
4. Run `npm test` — no existing tests should break (the column default preserves existing rows as `'trip'`)

## Update CONTEXT.md

Mark S7 as **Done** in the Sources Research Workspace slice table.
