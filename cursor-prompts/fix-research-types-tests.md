# Fix: Research queries — type safety + test coverage

## Context

`lib/social/research-queries.ts` uses `string` for `category` instead of `CategoryEnum`. The test file has only 2 happy-path tests.

Read these files first:
- `lib/social/research-queries.ts`
- `tests/research/research-queries.test.ts`
- `lib/types/enums.ts` (for `CategoryEnum`)
- `AGENTS.md`

## Fix 1 — `ResearchPlaceRow.category` type

In `lib/social/research-queries.ts` line 12:

Change:
```ts
category: string
```
To:
```ts
category: CategoryEnum
```

Add the import:
```ts
import { type CategoryEnum } from '@/lib/types/enums'
```

In the `rows.map()` at line 74, cast the raw category:
```ts
category: r.category as CategoryEnum,
```

This is safe because the RPC returns `category_enum` from Postgres which maps exactly to `CategoryEnum`.

## Fix 2 — Add error and edge-case tests

In `tests/research/research-queries.test.ts`, add these test cases:

### RPC error propagation
```ts
it('returns error message when RPC fails', async () => {
  rpcMock.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

  const result = await fetchResearchPlaces({ listId: 'list-uuid' })

  expect(result.data).toEqual([])
  expect(result.error).toBe('RPC failed')
})
```

### Empty result set
```ts
it('returns empty array when RPC returns null data', async () => {
  rpcMock.mockResolvedValue({ data: null, error: null })

  const result = await fetchResearchPlaces({ listId: 'list-uuid' })

  expect(result.data).toEqual([])
  expect(result.error).toBeNull()
})
```

### Malformed snippets
```ts
it('handles malformed top_snippets gracefully', async () => {
  rpcMock.mockResolvedValue({
    data: [
      {
        place_id: 'p1',
        name: 'Test Place',
        category: 'restaurant',
        lat: 13.7,
        lng: 100.5,
        overlap_count: 1,
        net_score: 0,
        user_vote: null,
        top_snippets: 'not-an-array',
      },
    ],
    error: null,
  })

  const result = await fetchResearchPlaces({ listId: 'list-uuid' })

  expect(result.data).toHaveLength(1)
  expect(result.data[0].top_snippets).toEqual([])
})
```

### Vote value normalization
```ts
it('normalizes unexpected vote values to null', async () => {
  rpcMock.mockResolvedValue({
    data: [
      {
        place_id: 'p1',
        name: 'Test Place',
        category: 'restaurant',
        lat: 13.7,
        lng: 100.5,
        overlap_count: 2,
        net_score: 5,
        user_vote: 2,
        top_snippets: [],
      },
    ],
    error: null,
  })

  const result = await fetchResearchPlaces({ listId: 'list-uuid' })

  expect(result.data[0].user_vote).toBeNull()
})
```

## What NOT to change

- Don't change `fetchResearchPlaces` function signature or return shape
- Don't change `parseSnippets` or `toBoundsEwkt` logic
- Don't add integration tests or Supabase mocks beyond the existing RPC mock pattern

## Verification

Run `npx vitest run tests/research` to confirm all tests pass, then `npm run check`.
