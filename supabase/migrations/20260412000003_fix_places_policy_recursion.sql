-- Fix infinite recursion in list_items RLS.
--
-- Root cause: "Collaborators can view places in shared lists" on public.places
-- queried list_items, which triggered the list_items policy, which re-queried
-- places — an infinite cycle. Break it with a SECURITY DEFINER helper that
-- bypasses RLS re-entry on both tables.

create or replace function public.can_user_view_place_via_collab(p_place_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.list_items li
    join public.list_collaborators lc on lc.list_id = li.list_id
    join public.list_shares ls on ls.list_id = lc.list_id
    where li.place_id = p_place_id
      and lc.user_id = auth.uid()
      and ls.permission = 'edit'
      and (ls.expires_at is null or ls.expires_at > now())
  );
$$;

drop policy if exists "Collaborators can view places in shared lists" on public.places;

create policy "Collaborators can view places in shared lists"
  on public.places
  for select
  using (public.can_user_view_place_via_collab(id));
