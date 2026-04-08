-- Social places are AI-extracted and should be invisible on the main map and
-- in place panels until the user explicitly adds them to a list from the
-- Sources workspace. Once in a list_item, they appear like any other place.

create or replace view public.places_view
with (security_invoker = true) as
select
  id,
  user_id,
  name,
  category,
  created_at,
  st_y(location::geometry) as lat,
  st_x(location::geometry) as lng
from public.places
where source != 'social'
   or exists (
     select 1 from public.list_items li where li.place_id = places.id
   );
