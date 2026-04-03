-- Per-transit-mode toggles (subway, bus, rail) for GTFS overlay when map layer is transit
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS transit_modes text[] NOT NULL DEFAULT ARRAY['subway'];

ALTER TABLE user_preferences
  ADD CONSTRAINT transit_modes_valid CHECK (
    transit_modes <@ ARRAY['subway', 'bus', 'rail']::text[]
    AND cardinality(transit_modes) >= 1
  );
