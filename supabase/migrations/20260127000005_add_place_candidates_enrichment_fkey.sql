-- Add foreign key constraint for enrichment_id in place_candidates.
-- This replaces the previously-invalid migration filename `20240125000004b_add_enrichment_fkey.sql`
-- (Supabase requires filenames to match "<timestamp>_name.sql").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'place_candidates_enrichment_id_fkey'
  ) THEN
    ALTER TABLE place_candidates
      ADD CONSTRAINT place_candidates_enrichment_id_fkey
      FOREIGN KEY (enrichment_id) REFERENCES enrichments(id) ON DELETE SET NULL;
  END IF;
END $$;

