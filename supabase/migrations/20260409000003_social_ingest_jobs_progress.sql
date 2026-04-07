ALTER TABLE public.social_ingest_jobs
  ADD COLUMN IF NOT EXISTS progress_message TEXT;
