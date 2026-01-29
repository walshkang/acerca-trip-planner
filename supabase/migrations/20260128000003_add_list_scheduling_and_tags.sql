-- Phase 2: list scheduling fields + list-scoped tags + optional trip metadata

ALTER TABLE list_items
  ADD COLUMN scheduled_date DATE,
  ADD COLUMN scheduled_start_time TIME,
  ADD COLUMN scheduled_end_time TIME,
  ADD COLUMN scheduled_order DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN last_scheduled_at TIMESTAMPTZ,
  ADD COLUMN last_scheduled_by UUID REFERENCES auth.users(id),
  ADD COLUMN last_scheduled_source TEXT,
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX list_items_list_id_scheduled_date_order_idx
  ON list_items(list_id, scheduled_date, scheduled_order);

CREATE INDEX list_items_list_id_completed_at_idx
  ON list_items(list_id, completed_at);

CREATE INDEX list_items_tags_gin_idx
  ON list_items USING GIN(tags);

ALTER TABLE lists
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN timezone TEXT;
