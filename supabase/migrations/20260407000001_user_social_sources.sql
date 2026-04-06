-- Links app users to social content they ingested (for Sources workspace).

create table public.user_social_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.social_sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, source_id)
);

create index user_social_sources_user_id_idx on public.user_social_sources (user_id);

alter table public.user_social_sources enable row level security;

create policy "select own" on public.user_social_sources
  for select
  using (auth.uid() = user_id);

create policy "insert own" on public.user_social_sources
  for insert
  with check (auth.uid() = user_id);

-- Aggregated list for GET /api/enrichment/user-sources (contract for S6c).
-- Inner joins omit sources with no mentions/places.
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
                'snippet', sm.snippet,
                'sentiment', sm.sentiment
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
