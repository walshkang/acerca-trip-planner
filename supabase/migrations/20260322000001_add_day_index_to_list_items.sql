-- Add day_index to list_items for dateless trip support.
-- When a trip has dates, day_index is derived from scheduled_date - start_date.
-- When a trip is dateless, day_index is the primary scheduling field.

ALTER TABLE list_items
  ADD COLUMN day_index integer;

-- Backfill day_index for items that already have scheduled_date + a list with start_date
UPDATE list_items li
SET day_index = (li.scheduled_date - l.start_date)::integer
FROM lists l
WHERE li.list_id = l.id
  AND li.scheduled_date IS NOT NULL
  AND l.start_date IS NOT NULL;

-- Constraint: day_index must be non-negative when set
ALTER TABLE list_items
  ADD CONSTRAINT day_index_non_negative CHECK (day_index IS NULL OR day_index >= 0);
