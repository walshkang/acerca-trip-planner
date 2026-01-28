-- Create lists (user-defined collections) and list_items (membership)

CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX lists_user_id_default_unique
  ON lists(user_id)
  WHERE is_default;

CREATE INDEX lists_user_id_created_at_idx ON lists(user_id, created_at);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lists"
  ON lists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, place_id)
);

CREATE INDEX list_items_list_id_created_at_idx ON list_items(list_id, created_at);
CREATE INDEX list_items_place_id_idx ON list_items(place_id);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage list items for their lists"
  ON list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM lists l
      WHERE l.id = list_id
        AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lists l
      WHERE l.id = list_id
        AND l.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM places p
      WHERE p.id = place_id
        AND p.user_id = auth.uid()
    )
  );
