# Fix: POST /items — scope social places to attached sources

## Context

`app/api/lists/[id]/items/route.ts` POST allows adding *any* `source = 'social'` place to a list (line ~312). It should only allow social places that come from sources attached to a research list the user has access to.

Read these files first:
- `app/api/lists/[id]/items/route.ts`
- `supabase/migrations/20260410000001_research_workspace.sql` (for `list_sources` and `social_mentions` schema)
- `AGENTS.md`

## The problem

Lines 311–317:
```ts
const { data: socialPlace, error: socialErr } = await supabase
  .from('places')
  .select('id, enrichment_id')
  .eq('id', placeId)
  .eq('source', 'social')
  .maybeSingle()
```

This accepts any social place, even from sources the user has never ingested. In the research workspace flow, a place should only be addable to a trip if it appears in an attached source (i.e., it has a `social_mentions` row whose `source_id` is in a `list_sources` row for a list the user owns or collaborates on).

## Fix

Replace the social place lookup (lines 311–326) with a query that verifies source attachment:

```ts
const { data: socialPlace, error: socialErr } = await supabase
  .from('places')
  .select('id, enrichment_id')
  .eq('id', placeId)
  .eq('source', 'social')
  .filter('id', 'in', `(select sm.place_id from social_mentions sm join list_sources ls on ls.source_id = sm.source_id where ls.list_id in (select l.id from lists l left join list_collaborators lc on lc.list_id = l.id where l.user_id = '${user.id}' or lc.user_id = '${user.id}'))`)
  .maybeSingle()
```

**Wait — PostgREST `.filter()` doesn't support raw subqueries like that.** Instead, do a two-step check:

1. Keep the existing social place lookup as-is (find the place by id + source = 'social')
2. After finding the social place, verify attachment:

```ts
if (!ownPlace) {
  // Step 1: Does this social place exist?
  const { data: socialPlace, error: socialErr } = await supabase
    .from('places')
    .select('id, enrichment_id')
    .eq('id', placeId)
    .eq('source', 'social')
    .maybeSingle()

  if (socialErr) {
    return NextResponse.json(
      { error: socialErr.message || 'Place lookup failed' },
      { status: 500 }
    )
  }

  if (socialPlace) {
    // Step 2: Is this place from an attached source the user can see?
    const { count, error: attachErr } = await supabase
      .from('social_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('place_id', placeId)
      .in(
        'source_id',
        // list_sources is RLS-protected — only returns rows for lists the user owns/collaborates on
        supabase.from('list_sources').select('source_id')
      )

    if (attachErr || !count) {
      // Place exists but user has no attached source for it
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    place = socialPlace
  }
}
```

**Note:** If Supabase JS client doesn't support nested `in` with a subquery builder, use an alternative approach:

```ts
// Fetch all source_ids from user's list_sources (RLS filters to accessible lists)
const { data: userSources } = await supabase
  .from('list_sources')
  .select('source_id')

const userSourceIds = (userSources ?? []).map((s) => s.source_id)

if (userSourceIds.length === 0) {
  return NextResponse.json({ error: 'Place not found' }, { status: 404 })
}

const { count } = await supabase
  .from('social_mentions')
  .select('id', { count: 'exact', head: true })
  .eq('place_id', placeId)
  .in('source_id', userSourceIds)

if (!count) {
  return NextResponse.json({ error: 'Place not found' }, { status: 404 })
}

place = socialPlace
```

Use whichever approach the Supabase JS client supports. The key constraint: **a social place is only addable if the user has at least one list_sources row linking to a social_mentions row for that place.**

## What NOT to change

- Don't change the GET or DELETE handlers
- Don't change the own-place lookup path (lines 295–310)
- Don't change the tag/notes logic below the place resolution
- Don't change the conflict/upsert handling

## Verification

Run `npm run check` before committing.
