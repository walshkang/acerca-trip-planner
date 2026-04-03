INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transit-cache',
  'transit-cache',
  false,
  10485760,
  ARRAY['application/json', 'application/geo+json']
)
ON CONFLICT (id) DO NOTHING;
