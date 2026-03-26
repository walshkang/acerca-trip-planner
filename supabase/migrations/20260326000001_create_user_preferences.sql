-- User preferences table for per-user settings (map layer, etc.)
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  map_layer text not null default 'default' check (map_layer in ('default', 'satellite', 'terrain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_user_id_key unique (user_id)
);

-- RLS: users can only read/write their own preferences
alter table user_preferences enable row level security;

create policy "Users can read own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reuse the existing updated_at trigger function
create trigger update_user_preferences_updated_at
  before update on user_preferences
  for each row
  execute function update_updated_at_column();
