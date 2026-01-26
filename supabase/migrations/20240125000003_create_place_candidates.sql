-- Create place_candidates table (staging/raw layer)
CREATE TABLE place_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'google', 'manual', etc.
  source_id TEXT, -- e.g., 'google:ChIJ...' or 'manual:uuid'
  raw_payload JSONB NOT NULL, -- Complete raw Google Places API response
  name TEXT NOT NULL,
  address TEXT,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'enriched', 'promoted', 'rejected', 'error')),
  error_message TEXT,
  enrichment_id UUID, -- Links to enrichments table (added after enrichments table is created)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX place_candidates_user_id_created_at_idx ON place_candidates(user_id, created_at);
CREATE INDEX place_candidates_user_id_status_idx ON place_candidates(user_id, status);
CREATE INDEX place_candidates_user_id_promoted_at_idx ON place_candidates(user_id, promoted_at);
CREATE INDEX place_candidates_source_source_id_idx ON place_candidates(source, source_id);

-- RLS
ALTER TABLE place_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own candidates"
  ON place_candidates
  FOR ALL
  USING (auth.uid() = user_id);
