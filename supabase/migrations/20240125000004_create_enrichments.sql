-- Create enrichments table (frozen AI normalization)
CREATE TABLE enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash TEXT NOT NULL, -- Hash of canonicalized raw source data
  schema_version INTEGER NOT NULL,
  normalized_data JSONB NOT NULL, -- AI-normalized tags, vibe, energy, etc. (validated against JSON schema)
  raw_sources JSONB NOT NULL, -- Snapshot of Google Places + Wikipedia/Wikidata data used
  model TEXT NOT NULL, -- LLM model identifier (e.g., 'gpt-4-turbo', 'gemini-pro')
  temperature NUMERIC NOT NULL CHECK (temperature = 0), -- Must be 0 for determinism
  prompt_version TEXT NOT NULL, -- Version identifier for system prompt/contract (e.g., 'v1.0')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
ALTER TABLE enrichments ADD CONSTRAINT enrichments_source_hash_schema_version_unique 
  UNIQUE (source_hash, schema_version);

-- Indexes
CREATE INDEX enrichments_source_hash_schema_version_idx ON enrichments(source_hash, schema_version);
CREATE INDEX enrichments_schema_version_idx ON enrichments(schema_version);

-- Note: enrichments table has no user_id and is server-only (never directly exposed to clients)
-- RLS is not needed as this table is accessed only via server-side API routes
