-- Add foreign key constraint for enrichment_id in place_candidates
ALTER TABLE place_candidates 
  ADD CONSTRAINT place_candidates_enrichment_id_fkey 
  FOREIGN KEY (enrichment_id) REFERENCES enrichments(id) ON DELETE SET NULL;
