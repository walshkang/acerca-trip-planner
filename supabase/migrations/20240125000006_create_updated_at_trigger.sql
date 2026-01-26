-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to places table
CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
