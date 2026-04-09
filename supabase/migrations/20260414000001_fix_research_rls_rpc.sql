-- 2026-04-14: RLS policy hardening + RPC vote aggregation optimization
-- 1. research_votes DELETE: add list-access check (was user_id-only)
-- 2. list_sources collaborator: remove redundant lists join
-- 3. discover_research_places: replace per-place LATERAL with pre-aggregated CTE

-- DROP affected policies (by exact name)
DROP POLICY IF EXISTS "Edit collaborators manage list_sources on shared research lists" ON public.list_sources;
DROP POLICY IF EXISTS "List owners manage list_sources" ON public.list_sources;
DROP POLICY IF EXISTS "Users insert own research votes on accessible lists" ON public.research_votes;
DROP POLICY IF EXISTS "Users delete own research votes" ON public.research_votes;

-- Recreate owners policy (unchanged semantics)
CREATE POLICY "List owners manage list_sources"
  ON public.list_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_sources.list_id
        AND l.user_id = auth.uid()
        AND l.list_type = 'research'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_sources.list_id
        AND l.user_id = auth.uid()
        AND l.list_type = 'research'
    )
  );

-- Recreate collaborator policy — remove redundant lists join, keep existing join pattern
-- (list_shares is a list-level token with no user_id column; lc.user_id = auth.uid() is the user check)
CREATE POLICY "Edit collaborators manage list_sources on shared research lists"
  ON public.list_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.list_collaborators lc
      JOIN public.list_shares ls
        ON ls.list_id = lc.list_id
      WHERE lc.list_id = list_sources.list_id
        AND lc.user_id = auth.uid()
        AND ls.permission = 'edit'
        AND (ls.expires_at IS NULL OR ls.expires_at > now())
        AND EXISTS (
          SELECT 1 FROM public.lists l
          WHERE l.id = list_sources.list_id
            AND l.list_type = 'research'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.list_collaborators lc
      JOIN public.list_shares ls
        ON ls.list_id = lc.list_id
      WHERE lc.list_id = list_sources.list_id
        AND lc.user_id = auth.uid()
        AND ls.permission = 'edit'
        AND (ls.expires_at IS NULL OR ls.expires_at > now())
        AND EXISTS (
          SELECT 1 FROM public.lists l
          WHERE l.id = list_sources.list_id
            AND l.list_type = 'research'
        )
    )
  );

-- NOTE: do NOT modify the SELECT policy for list_sources (left unchanged elsewhere)

-- Recreate research_votes INSERT policy (unchanged from original — already correct)
CREATE POLICY "Users insert own research votes on accessible lists"
  ON public.research_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = research_votes.list_id
        AND l.list_type = 'research'
        AND (
          l.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.list_collaborators lc
            JOIN public.list_shares ls
              ON ls.list_id = lc.list_id
            WHERE lc.list_id = l.id
              AND lc.user_id = auth.uid()
              AND ls.permission = 'edit'
              AND (ls.expires_at IS NULL OR ls.expires_at > now())
          )
        )
    )
  );

-- NOTE: UPDATE policy "Users update own research votes" left untouched (not dropped, not recreated)

-- Recreate research_votes DELETE policy to ensure user still has list access
CREATE POLICY "Users delete own research votes"
  ON public.research_votes FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = research_votes.list_id
        AND l.list_type = 'research'
        AND (
          l.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.list_collaborators lc
            JOIN public.list_shares ls
              ON ls.list_id = lc.list_id
            WHERE lc.list_id = l.id
              AND lc.user_id = auth.uid()
              AND ls.permission = 'edit'
              AND (ls.expires_at IS NULL OR ls.expires_at > now())
          )
        )
    )
  );

-- DO NOT modify other policies (select/update) for research_votes

-- RPC: discover_research_places — rewrite vote aggregation to use a pre-aggregated CTE
CREATE OR REPLACE FUNCTION public.discover_research_places(
  p_list_id uuid,
  p_bounds geometry DEFAULT NULL
)
RETURNS TABLE (
  place_id uuid,
  name text,
  category category_enum,
  lat double precision,
  lng double precision,
  overlap_count bigint,
  net_score bigint,
  user_vote smallint,
  top_snippets jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH vote_scores AS (
    SELECT place_id, sum(vote_value)::bigint AS net_sum
    FROM research_votes
    WHERE list_id = p_list_id
    GROUP BY place_id
  )
  SELECT
    p.id AS place_id,
    p.name,
    p.category,
    st_y(p.location::geometry) AS lat,
    st_x(p.location::geometry) AS lng,
    count(distinct sm.source_id) AS overlap_count,
    coalesce(vs.net_sum, 0)::bigint AS net_score,
    (
      SELECT rv.vote_value::smallint
      FROM research_votes rv
      WHERE rv.list_id = p_list_id
        AND rv.place_id = p.id
        AND rv.user_id = auth.uid()
      LIMIT 1
    ) AS user_vote,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'author_name', ss.author_name,
          'snippet', sm.snippet,
          'platform', ss.platform
        )
        ORDER BY sm.created_at DESC
      ) FILTER (WHERE sm.id IS NOT NULL),
      '[]'::jsonb
    ) AS top_snippets
  FROM places p
  JOIN social_mentions sm ON sm.place_id = p.id
  JOIN social_sources ss ON ss.id = sm.source_id
  LEFT JOIN vote_scores vs ON vs.place_id = p.id
  WHERE p.source = 'social'
    AND sm.source_id IN (
      SELECT ls.source_id
      FROM list_sources ls
      WHERE ls.list_id = p_list_id
    )
    AND (p_bounds IS NULL OR st_within(p.location::geometry, p_bounds))
  GROUP BY p.id, p.name, p.category, p.location, vs.net_sum
  HAVING count(distinct sm.source_id) >= 1
  ORDER BY overlap_count DESC, net_score DESC, place_id ASC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.discover_research_places(uuid, geometry) TO authenticated;
