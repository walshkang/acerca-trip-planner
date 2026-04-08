-- Fix: allow social places (source = 'social') to be added to list_items.
-- The original WITH CHECK required p.user_id = auth.uid(), but social places
-- are owned by the system user. Extend the check to also permit social-sourced places.

DROP POLICY IF EXISTS "Users can manage list items for their lists" ON list_items;

CREATE POLICY "Users can manage list items for their lists"
  ON list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_id
        AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_id
        AND (p.user_id = auth.uid() OR p.source = 'social')
    )
  );
