-- Async social URL ingest: job queue + claim RPC (SKIP LOCKED).

create table social_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  source_id uuid references social_sources (id) on delete set null,
  error_message text,
  places_resolved integer not null default 0,
  places_failed integer not null default 0,
  failures jsonb,
  location_hint jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_ingest_jobs_status_created_idx on social_ingest_jobs (status, created_at);

-- At most one active job per user+url (re-queue after terminal state is allowed).
create unique index social_ingest_jobs_user_url_active_idx
  on social_ingest_jobs (user_id, url)
  where status in ('queued', 'running');

create trigger update_social_ingest_jobs_updated_at
  before update on social_ingest_jobs
  for each row
  execute function update_updated_at_column();

alter table social_ingest_jobs enable row level security;

create policy "Users read own social ingest jobs"
  on social_ingest_jobs for select
  using (auth.uid() = user_id);

create policy "Users insert own social ingest jobs"
  on social_ingest_jobs for insert
  with check (auth.uid() = user_id);

-- Status updates run via service role only (worker bypasses RLS).

comment on table social_ingest_jobs is 'Queued social URL ingestion; processed by service-role worker via claim_next_social_job.';

-- Claim next queued job (single row) using SKIP LOCKED for concurrent workers.
create or replace function claim_next_social_job()
returns social_ingest_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  result social_ingest_jobs;
begin
  with next_job as (
    select id
    from social_ingest_jobs
    where status = 'queued'
    order by created_at asc
    for update skip locked
    limit 1
  )
  update social_ingest_jobs j
  set status = 'running', updated_at = now()
  from next_job n
  where j.id = n.id
  returning j.* into result;

  return result;
end;
$$;

revoke all on function claim_next_social_job() from public;
grant execute on function claim_next_social_job() to service_role;

alter publication supabase_realtime add table social_ingest_jobs;
