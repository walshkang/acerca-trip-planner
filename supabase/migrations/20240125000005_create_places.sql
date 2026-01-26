-- Create places table (canonical layer - approved pins)
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  address TEXT,
  address_normalized TEXT GENERATED ALWAYS AS (lower(trim(address))) STORED,
  category category_enum NOT NULL,
  energy energy_enum,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  geohash7 TEXT GENERATED ALWAYS AS (ST_GeoHash(location::geometry, 7)) STORED,
  source TEXT NOT NULL, -- 'google', 'manual', etc. (matches place_candidates.source)
  source_id TEXT, -- e.g., 'google:ChIJ...' or 'manual:uuid' (matches place_candidates.source_id)
  google_place_id TEXT, -- Legacy, use source + source_id instead
  dedupe_key TEXT NOT NULL, -- Computed hash of (name_normalized, geohash7, address_normalized)
  opening_hours JSONB, -- Raw opening_hours JSON from Google Places
  enrichment_version INTEGER NOT NULL DEFAULT 1,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enrichment_source_hash TEXT NOT NULL, -- Hash of raw source data used for enrichment
  enrichment_id UUID REFERENCES enrichments(id) ON DELETE SET NULL,
  user_notes TEXT, -- User-added notes (never overwritten by AI)
  user_tags TEXT[], -- User-added tags (separate from AI tags)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE places ADD CONSTRAINT places_user_id_dedupe_key_unique 
  UNIQUE (user_id, dedupe_key);

-- Partial unique indexes for nullable columns
CREATE UNIQUE INDEX places_user_id_source_source_id_unique
  ON places(user_id, source, source_id)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX places_user_id_google_place_id_unique
  ON places(user_id, google_place_id)
  WHERE google_place_id IS NOT NULL;

-- Indexes
CREATE INDEX places_location_idx ON places USING GIST (location);
CREATE INDEX places_user_id_category_idx ON places(user_id, category);
CREATE INDEX places_user_id_updated_at_idx ON places(user_id, updated_at);
CREATE INDEX places_user_id_source_source_id_idx ON places(user_id, source, source_id);
CREATE INDEX places_user_id_google_place_id_idx ON places(user_id, google_place_id);

-- RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own places"
  ON places
  FOR ALL
  USING (auth.uid() = user_id);
