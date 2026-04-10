-- Migration: create research lists, sources, and places

create extension if not exists "pgcrypto";

create table if not exists research_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  research_list_id uuid not null references research_lists(id) on delete cascade,
  title text not null,
  url text,
  source_type text,
  metadata jsonb,
  transcript text,
  created_at timestamptz default now()
);

create table if not exists research_places (
  id uuid primary key default gen_random_uuid(),
  research_source_id uuid not null references research_sources(id) on delete cascade,
  name text not null,
  address text,
  place_id text,
  rating numeric,
  review_count integer,
  url text,
  lat numeric,
  lng numeric,
  raw_json jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_research_places_place_id on research_places(place_id);
create index if not exists idx_research_sources_list_id on research_sources(research_list_id);
