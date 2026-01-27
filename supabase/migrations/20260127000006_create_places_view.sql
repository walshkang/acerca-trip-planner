create or replace view public.places_view
with (security_invoker=true) as
select
  id,
  user_id,
  name,
  category,
  created_at,
  st_y(location::geometry) as lat,
  st_x(location::geometry) as lng
from public.places;
