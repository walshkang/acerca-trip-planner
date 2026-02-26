-- Discard unpromoted place_candidates for the current user.
-- This is an idempotent, best-effort cleanup used by the discovery preview reject/close flows.
-- It deliberately does NOT touch enrichments to preserve the Enrich Once, Read Forever invariant.

CREATE OR REPLACE FUNCTION public.discard_place_candidate(
  p_candidate_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Best-effort, idempotent delete:
  -- - scoped to the authenticated user via user_id = auth.uid()
  -- - skips already-promoted candidates as a safety guard
  -- - returns successfully even when no rows are affected
  DELETE FROM public.place_candidates
  WHERE id = p_candidate_id
    AND user_id = auth.uid()
    AND status <> 'promoted';
END;
$$;

GRANT EXECUTE ON FUNCTION public.discard_place_candidate(uuid) TO authenticated;

