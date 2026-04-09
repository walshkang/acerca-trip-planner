# Fix: RLS policy gaps + RPC vote aggregation — new migration

## Context

`supabase/migrations/20260410000001_research_workspace.sql` shipped with three RLS bugs and one performance issue. This prompt creates a corrective migration.

Read these files first:
- `supabase/migrations/20260410000001_research_workspace.sql` (the original, for reference)
- `AGENTS.md`, `CONTEXT.md`

## Bug 1 — `list_sources` collaborator policy missing `user_id` binding

**Policy:** "Edit collaborators manage list_sources on shared research lists" (lines 68–95)

The join `list_shares ls on ls.list_id = lc.list_id` doesn't bind the share to the current user. Any edit-permission share on the list satisfies the check for *every* collaborator.

**Fix:** Add `and ls.user_id = lc.user_id` to both the USING and WITH CHECK join conditions.

Also remove the redundant `join public.lists l on l.id = list_sources.list_id` — `lc.list_id = list_sources.list_id` already gives us the list_id; use a subquery `exists (select 1 from public.lists ...)` for the `list_type = 'research'` check instead.

## Bug 2 — `research_votes` INSERT policy missing `user_id` binding

**Policy:** "Users insert own research votes on accessible lists" (lines 132–152)

Same issue: the collaborator sub-check joins `list_shares` without `ls.user_id = lc.user_id`.

**Fix:** Add `and ls.user_id = lc.user_id` to the join inside the collaborator branch.

## Bug 3 — `research_votes` DELETE policy has no list-access check

**Policy:** "Users delete own research votes" (lines 159–161)

Currently: `using (user_id = auth.uid())`. A user removed from a list can still delete their old votes.

**Fix:** Replace with a USING clause that requires `user_id = auth.uid()` AND the user still has list access (owner or collaborator), mirroring the INSERT policy structure.

## Performance — `discover_research_places` LATERAL per-place vote aggregation

The RPC (lines 279–284) uses `LEFT JOIN LATERAL` to compute `net_sum` per place. For large place sets this is slow.

**Fix:** Replace with a CTE that pre-aggregates votes once:

```sql
with vote_scores as (
  select place_id, sum(vote_value)::bigint as net_sum
  from research_votes
  where list_id = p_list_id
  group by place_id
)
```

Then join `vote_scores` in the main query: `left join vote_scores vs on vs.place_id = p.id` and use `coalesce(vs.net_sum, 0)::bigint as net_score`.

## Migration file

Create: `supabase/migrations/20260414000001_fix_research_rls_rpc.sql`

Structure:
1. `drop policy` for each of the four affected policies (by exact name)
2. `create policy` replacements with the fixes above
3. `create or replace function public.discover_research_places(...)` with the CTE rewrite — keep all other logic (bounds filter, snippet aggregation, user_vote scalar subquery, sort, limit 500) identical

## What NOT to change

- Don't touch the `list_items` policies — those are correct
- Don't touch the SELECT policies for `list_sources` or `research_votes` — those are correct
- Don't touch the UPDATE policy for `research_votes` — `using (user_id = auth.uid())` is fine for updates
- Don't add new tables, columns, or indexes

## Verification

After writing the migration, run `npm run db:types` if available, or confirm the migration is valid SQL.
