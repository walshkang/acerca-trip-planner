-- Add curated_data to enrichments (UI-safe, frozen extraction)
ALTER TABLE public.enrichments
  ADD COLUMN IF NOT EXISTS curated_data JSONB;

CREATE INDEX IF NOT EXISTS enrichments_curated_data_idx
  ON public.enrichments USING GIN (curated_data);

