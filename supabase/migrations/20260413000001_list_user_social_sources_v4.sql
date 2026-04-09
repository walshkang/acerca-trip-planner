create or replace function public.list_user_social_sources ()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'source_id', sub.source_id,
          'created_at', sub.created_at,
          'url', sub.url,
          'platform', sub.platform,
          'title', sub.title,
          'author_name', sub.author_name,
          'author_persona', sub.author_persona,
          'places', sub.places
        )
        order by sub.created_at desc
      )
      from (
        select
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'place_id', p.id,
                'place_name', p.name,
                'category', p.category,
                'google_place_id', p.google_place_id,
                'google_rating', p.google_rating,
                'google_review_count', p.google_review_count,
                'address', p.address,
                'opening_hours', p.opening_hours,
                'snippet', sm.snippet,
                'sentiment', sm.sentiment,
                'tags', coalesce(sm.tags, '{}'),
                'callouts', coalesce(sm.callouts, '[]'::jsonb),
                'lat', st_y(p.location::geometry),
                'lng', st_x(p.location::geometry)
              )
              order by sm.created_at
            ),
            '[]'::jsonb
          ) as places
        from user_social_sources uss
        join social_sources ss on ss.id = uss.source_id
        join social_mentions sm on sm.source_id = uss.source_id
        join places p on p.id = sm.place_id
        where uss.user_id = auth.uid()
        group by
          uss.source_id,
          uss.created_at,
          ss.url,
          ss.platform,
          ss.title,
          ss.author_name,
          ss.author_persona
      ) sub
    ),
    '[]'::jsonb
  );
$$;

grant execute on function public.list_user_social_sources () to authenticated;
