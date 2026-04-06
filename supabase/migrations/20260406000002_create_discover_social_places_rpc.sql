-- discover_social_places: query social-discovered places with mention counts and persona filtering.
-- Powers the social discovery map layer. Returns places joined through social_mentions
-- and social_sources, with aggregated persona arrays and snippet context.

create or replace function public.discover_social_places(
  p_persona persona_enum default null,
  p_min_mentions int default 1,
  p_bounds geometry default null
)
returns table (
  place_id uuid,
  name text,
  category category_enum,
  lat double precision,
  lng double precision,
  mention_count bigint,
  personas persona_enum[],
  top_snippets jsonb
)
language sql
stable
set search_path = public
as $$
  select
    p.id as place_id,
    p.name,
    p.category,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    count(distinct sm.id) as mention_count,
    array_agg(distinct ss.author_persona) as personas,
    jsonb_agg(
      jsonb_build_object(
        'author_name', ss.author_name,
        'snippet', sm.snippet,
        'platform', ss.platform,
        'sentiment', sm.sentiment
      ) order by sm.created_at desc
    ) filter (where sm.id is not null) as top_snippets
  from places p
  join social_mentions sm on sm.place_id = p.id
  join social_sources ss on ss.id = sm.source_id
  where p.source = 'social'
    and (p_persona is null or ss.author_persona = p_persona)
    and (p_bounds is null or st_within(p.location::geometry, p_bounds))
  group by p.id, p.name, p.category, p.location
  having count(distinct sm.id) >= p_min_mentions
  order by mention_count desc
  limit 500;
$$;

-- Allow authenticated users to call this function
grant execute on function public.discover_social_places(persona_enum, int, geometry) to authenticated;
