alter table user_preferences
  add column if not exists dismissed_tips text[] not null default '{}',
  add column if not exists tips_disabled boolean not null default false;
