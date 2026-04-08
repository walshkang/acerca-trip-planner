-- The migration 20260412000001 created a redundant "Users can manage list items for their lists"
-- policy because the original had already been renamed to "Owners can manage their list items"
-- (which already had the social places fix). Drop the duplicate.

DROP POLICY IF EXISTS "Users can manage list items for their lists" ON list_items;
