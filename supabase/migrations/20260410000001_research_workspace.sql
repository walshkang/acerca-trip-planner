-- S7: Research workspace — list_type, list_sources, research_votes, list_items.notes
-- S8: discover_research_places RPC (overlap ranking + votes + bounds)

-- ─── lists.list_type ───

alter table public.lists
  add column if not exists list_type text not null default 'trip'
    check (list_type in ('trip', 'research'));

-- ─── list_items.notes (provenance when adding from research → trip) ───

alter table public.list_items
  add column if not exists notes text;

-- ─── list_sources: social sources attached to a research list ───

create table if not exists public.list_sources (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  source_id uuid not null references public.social_sources(id) on delete cascade,
  is_starred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (list_id, source_id)
);

create index if not exists list_sources_list_id_idx on public.list_sources(list_id);
create index if not exists list_sources_source_id_idx on public.list_sources(source_id);

alter table public.list_sources enable row level security;

-- ─── research_votes: per-user +/- on places within a research list ───

create table if not exists public.research_votes (
  list_id uuid not null references public.lists(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (list_id, place_id, user_id)
);

create index if not exists research_votes_list_place_idx
  on public.research_votes(list_id, place_id);

alter table public.research_votes enable row level security;

-- ─── RLS: list_sources (owner + edit collaborators, research lists only) ───

create policy "List owners manage list_sources"
  on public.list_sources for all
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_sources.list_id
        and l.user_id = auth.uid()
        and l.list_type = 'research'
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_sources.list_id
        and l.user_id = auth.uid()
        and l.list_type = 'research'
    )
  );

create policy "Edit collaborators manage list_sources on shared research lists"
  on public.list_sources for all
  using (
    exists (
      select 1
      from public.list_collaborators lc
      join public.list_shares ls on ls.list_id = lc.list_id
      join public.lists l on l.id = list_sources.list_id
      where lc.list_id = list_sources.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
        and l.list_type = 'research'
    )
  )
  with check (
    exists (
      select 1
      from public.list_collaborators lc
      join public.list_shares ls on ls.list_id = lc.list_id
      join public.lists l on l.id = list_sources.list_id
      where lc.list_id = list_sources.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
        and l.list_type = 'research'
    )
  );

create policy "List accessors can read list_sources"
  on public.list_sources for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_sources.list_id
        and (
          l.user_id = auth.uid()
          or exists (
            select 1 from public.list_collaborators lc
            where lc.list_id = l.id and lc.user_id = auth.uid()
          )
        )
    )
  );

-- ─── RLS: research_votes ───

create policy "List accessors can read research votes"
  on public.research_votes for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = research_votes.list_id
        and l.list_type = 'research'
        and (
          l.user_id = auth.uid()
          or exists (
            select 1 from public.list_collaborators lc
            where lc.list_id = l.id and lc.user_id = auth.uid()
          )
        )
    )
  );

create policy "Users insert own research votes on accessible lists"
  on public.research_votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lists l
      where l.id = research_votes.list_id
        and l.list_type = 'research'
        and (
          l.user_id = auth.uid()
          or exists (
            select 1 from public.list_collaborators lc
            join public.list_shares ls on ls.list_id = lc.list_id
            where lc.list_id = l.id
              and lc.user_id = auth.uid()
              and ls.permission = 'edit'
              and (ls.expires_at is null or ls.expires_at > now())
          )
        )
    )
  );

create policy "Users update own research votes"
  on public.research_votes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete own research votes"
  on public.research_votes for delete
  using (user_id = auth.uid());

-- ─── list_items: allow adding social/system places to trip lists (S10) ───

drop policy if exists "Owners can manage their list items" on public.list_items;

create policy "Owners can manage their list items"
  on public.list_items for all
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.places p
        where p.id = list_items.place_id and p.user_id = auth.uid()
      )
      or exists (
        select 1 from public.places p
        where p.id = list_items.place_id and p.source = 'social'
      )
    )
  );

drop policy if exists "Collaborators can manage shared list items" on public.list_items;

create policy "Collaborators can manage shared list items"
  on public.list_items for all
  using (
    exists (
      select 1 from public.list_collaborators lc
      join public.list_shares ls on ls.list_id = lc.list_id
      where lc.list_id = list_items.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from public.list_collaborators lc
      join public.list_shares ls on ls.list_id = lc.list_id
      where lc.list_id = list_items.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
    )
    and (
      exists (
        select 1 from public.places p
        where p.id = list_items.place_id and p.user_id = auth.uid()
      )
      or exists (
        select 1 from public.places p
        where p.id = list_items.place_id and p.source = 'social'
      )
    )
  );

-- ─── discover_research_places ───

create or replace function public.discover_research_places(
  p_list_id uuid,
  p_bounds geometry default null
)
returns table (
  place_id uuid,
  name text,
  category category_enum,
  lat double precision,
  lng double precision,
  overlap_count bigint,
  net_score bigint,
  user_vote smallint,
  top_snippets jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id as place_id,
    p.name,
    p.category,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    count(distinct sm.source_id) as overlap_count,
    coalesce(vscore.net_sum, 0)::bigint as net_score,
    (
      select rv.vote_value::smallint
      from research_votes rv
      where rv.list_id = p_list_id
        and rv.place_id = p.id
        and rv.user_id = auth.uid()
      limit 1
    ) as user_vote,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'author_name', ss.author_name,
          'snippet', sm.snippet,
          'platform', ss.platform
        )
        order by sm.created_at desc
      ) filter (where sm.id is not null),
      '[]'::jsonb
    ) as top_snippets
  from places p
  join social_mentions sm on sm.place_id = p.id
  join social_sources ss on ss.id = sm.source_id
  left join lateral (
    select sum(rv.vote_value)::bigint as net_sum
    from research_votes rv
    where rv.list_id = p_list_id
      and rv.place_id = p.id
  ) vscore on true
  where p.source = 'social'
    and sm.source_id in (
      select ls.source_id
      from list_sources ls
      where ls.list_id = p_list_id
    )
    and (p_bounds is null or st_within(p.location::geometry, p_bounds))
  group by p.id, p.name, p.category, p.location, vscore.net_sum
  having count(distinct sm.source_id) >= 1
  order by overlap_count desc, net_score desc, place_id asc
  limit 500;
$$;

grant execute on function public.discover_research_places(uuid, geometry) to authenticated;
