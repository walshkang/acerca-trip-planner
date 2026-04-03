-- Allow "ferry" in user_preferences.transit_modes (canonical GTFS toggle).
ALTER TABLE user_preferences DROP CONSTRAINT transit_modes_valid;
ALTER TABLE user_preferences ADD CONSTRAINT transit_modes_valid CHECK (
  transit_modes <@ ARRAY['subway', 'bus', 'rail', 'ferry']::text[]
);
