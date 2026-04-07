-- Add tags and callouts to social_mentions
alter table public.social_mentions
  add column if not exists tags text[] not null default '{}',
  add column if not exists callouts jsonb not null default '[]';

-- Add Google rating fields to places
alter table public.places
  add column if not exists google_rating numeric(3,1),
  add column if not exists google_review_count integer;

-- Index for filtering/sorting by rating
create index if not exists places_google_rating_idx on public.places (google_rating);
