-- Phase 1+2: Share links + collaborator access for lists
-- Enables multi-user editing of trip lists via shareable links.

-- ─── list_shares: shareable tokens for lists ───

create table list_shares (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  token text unique not null default encode(extensions.gen_random_bytes(24), 'hex'),
  permission text not null default 'edit' check (permission in ('view', 'edit')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz -- null = never expires
);

create index list_shares_list_id_idx on list_shares(list_id);
create index list_shares_token_idx on list_shares(token);

alter table list_shares enable row level security;

-- Owner can manage their shares
create policy "Owners can manage shares"
  on list_shares for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Anyone authenticated (including anonymous) can look up a share by token
-- This is needed for the join flow: user has the token, needs to resolve it
create policy "Authenticated users can resolve share tokens"
  on list_shares for select
  using (auth.uid() is not null);

-- ─── list_collaborators: tracks who has joined via a share link ───

create table list_collaborators (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_via_share_id uuid references list_shares(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint list_collaborators_unique unique (list_id, user_id)
);

create index list_collaborators_list_id_idx on list_collaborators(list_id);
create index list_collaborators_user_id_idx on list_collaborators(user_id);

alter table list_collaborators enable row level security;

-- Owner of the list can see collaborators
create policy "List owners can view collaborators"
  on list_collaborators for select
  using (
    exists (
      select 1 from lists where lists.id = list_id and lists.user_id = auth.uid()
    )
  );

-- Owner can remove collaborators
create policy "List owners can remove collaborators"
  on list_collaborators for delete
  using (
    exists (
      select 1 from lists where lists.id = list_id and lists.user_id = auth.uid()
    )
  );

-- A user can see their own collaborator record
create policy "Users can view own collaborator records"
  on list_collaborators for select
  using (user_id = auth.uid());

-- Insert is done via the join RPC (below) using service role or a permissive policy
-- We allow insert if the user is joining themselves (user_id = auth.uid())
-- and a valid share exists for that list
create policy "Users can join via valid share"
  on list_collaborators for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from list_shares
      where list_shares.list_id = list_collaborators.list_id
        and (list_shares.expires_at is null or list_shares.expires_at > now())
    )
  );

-- ─── Extend RLS on lists: collaborators can access shared lists ───

create policy "Collaborators can view shared lists"
  on lists for select
  using (
    exists (
      select 1 from list_collaborators
      where list_collaborators.list_id = lists.id
        and list_collaborators.user_id = auth.uid()
    )
  );

create policy "Collaborators can update shared lists"
  on lists for update
  using (
    exists (
      select 1 from list_collaborators lc
      join list_shares ls on ls.list_id = lc.list_id
      where lc.list_id = lists.id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
    )
  );

-- ─── Extend RLS on list_items: collaborators can manage items ───

-- Drop the existing restrictive policy and replace with one that supports collaborators
-- The old policy required places.user_id = auth.uid() on INSERT, which blocks collaborators.
drop policy if exists "Users can manage list items for their lists" on list_items;

-- Owner can do everything (original behavior, but without the places ownership check on insert
-- since collaborators need to add the owner's places to the list)
create policy "Owners can manage their list items"
  on list_items for all
  using (
    exists (
      select 1 from lists where lists.id = list_id and lists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from lists where lists.id = list_id and lists.user_id = auth.uid()
    )
  );

-- Collaborators with edit permission can SELECT, INSERT, UPDATE, DELETE list items
create policy "Collaborators can manage shared list items"
  on list_items for all
  using (
    exists (
      select 1 from list_collaborators lc
      join list_shares ls on ls.list_id = lc.list_id
      where lc.list_id = list_items.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
    )
  )
  with check (
    exists (
      select 1 from list_collaborators lc
      join list_shares ls on ls.list_id = lc.list_id
      where lc.list_id = list_items.list_id
        and lc.user_id = auth.uid()
        and ls.permission = 'edit'
        and (ls.expires_at is null or ls.expires_at > now())
    )
  );

-- ─── Collaborators need read access to places in shared lists ───

create policy "Collaborators can view places in shared lists"
  on places for select
  using (
    exists (
      select 1 from list_items li
      join list_collaborators lc on lc.list_id = li.list_id
      where li.place_id = places.id
        and lc.user_id = auth.uid()
    )
  );
