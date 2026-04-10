-- Add telemetry fields to social_ingest_jobs for auditing and debugging

ALTER TABLE public.social_ingest_jobs
  ADD COLUMN IF NOT EXISTS fetch_ms INTEGER,
  ADD COLUMN IF NOT EXISTS extract_ms INTEGER,
  ADD COLUMN IF NOT EXISTS places_ms INTEGER,
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS raw_llm_output TEXT;
