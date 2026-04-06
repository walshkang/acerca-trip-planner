# Social Discovery S1 — Schema Migration

## What to build

A single Supabase migration that adds the social discovery layer to the schema:
- `persona_enum` — classifies content creator vibe
- `social_sources` — one row per piece of social content (video, blog post, etc.)
- `social_mentions` — join table: which source mentioned which place, with snippet context

No UI. No API routes. No TypeScript changes (those come after `npm run db:types`).

## Files to create

- `supabase/migrations/20260406000001_create_social_discovery_schema.sql`

## Files to reference (read these first)

- `supabase/migrations/20240125000002_create_enums.sql` — how enums are created in this project
- `supabase/migrations/20260326000002_create_list_shares_and_collaborators.sql` — reference for table structure, index style, and RLS policy patterns
- `supabase/migrations/20240125000005_create_places.sql` — places table schema, particularly `user_id`, `source`, `source_id` columns that social places will use
- `docs/SOCIAL_DISCOVERY_PIPELINE.md` — Slice 1 has the full spec

## Migration content

```sql
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
-- The existing places RLS only lets users see their own rows.
-- Add a permissive SELECT policy for social-source places.

create policy "Authenticated users can read social places"
  on places for select
  using (
    auth.uid() is not null
    and source = 'social'
  );
```

## What NOT to do

- Don't modify the `places` table schema — social places reuse it as-is
- Don't add a `user_id` column to `social_sources` or `social_mentions` — they're server-owned
- Don't add write policies to `social_sources` or `social_mentions` — only service role writes these (no RLS INSERT policy needed; service role bypasses RLS)
- Don't create the `discover_social_places` RPC in this migration — that's S3
- Don't add triggers or functions beyond the schema

## After applying

1. Run `npm run db:types` to regenerate `lib/supabase/types.ts`
2. Verify `social_sources` and `social_mentions` appear in the types
3. Verify `persona_enum` appears in `Database['public']['Enums']`
4. Run `npm test` — no existing tests should break
