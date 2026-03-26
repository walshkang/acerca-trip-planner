-- Fix infinite recursion: list_collaborators policies query lists,
-- which triggers lists policies that query list_collaborators.
-- Solution: a SECURITY DEFINER function that checks list ownership
-- without going through RLS.

create or replace function is_list_owner(p_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from lists
    where id = p_list_id and user_id = auth.uid()
  );
$$;

-- Drop the recursive policies on list_collaborators
drop policy if exists "List owners can view collaborators" on list_collaborators;
drop policy if exists "List owners can remove collaborators" on list_collaborators;

-- Recreate using the SECURITY DEFINER function (no RLS re-entry on lists)
create policy "List owners can view collaborators"
  on list_collaborators for select
  using (is_list_owner(list_id));

create policy "List owners can remove collaborators"
  on list_collaborators for delete
  using (is_list_owner(list_id));
