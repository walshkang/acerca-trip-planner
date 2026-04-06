-- Social Discovery Layer
-- Adds persona_enum, social_sources, and social_mentions.
-- Social-discovered places are inserted into the existing `places` table
-- owned by a system user (SOCIAL_SYSTEM_USER_ID env var).

-- ─── Enum ───

create type persona_enum as enum (
  'local',
  'luxury',
  'budget',
  'design',
  'foodie',
  'adventure',
  'family',
  'nightlife'
);

-- ─── social_sources: one row per piece of social content ───

create table social_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null check (platform in ('tiktok', 'youtube', 'blog', 'instagram', 'reddit', 'other')),
  author_name text not null,
  author_persona persona_enum not null,
  title text,
  raw_transcript text,
  ingested_at timestamptz not null default now(),
  constraint social_sources_url_unique unique (url)
);

create index social_sources_platform_idx on social_sources(platform);
create index social_sources_persona_idx on social_sources(author_persona);

-- RLS: all authenticated users can read; only service role can write
alter table social_sources enable row level security;

create policy "Authenticated users can read social sources"
  on social_sources for select
  using (auth.uid() is not null);

-- ─── social_mentions: which source mentioned which place ───

create table social_mentions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references social_sources(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  snippet text not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'mixed')),
  created_at timestamptz not null default now(),
  constraint social_mentions_source_place_unique unique (source_id, place_id)
);

create index social_mentions_place_id_idx on social_mentions(place_id);
create index social_mentions_source_id_idx on social_mentions(source_id);

-- RLS: all authenticated users can read; only service role can write
alter table social_mentions enable row level security;

create policy "Authenticated users can read social mentions"
  on social_mentions for select
  using (auth.uid() is not null);

-- ─── Extend places RLS: social places readable by all authenticated users ───
-- Social places have user_id = SOCIAL_SYSTEM_USER_ID (a fixed service account UUID).
-- The existing places RLS policy ("Users can only see their own places") uses
-- FOR ALL with auth.uid() = user_id, so social places are invisible to real users.
-- Add a permissive SELECT policy so any authenticated user can read social places.

create policy "Authenticated users can read social places"
  on places for select
  using (
    auth.uid() is not null
    and source = 'social'
  );
