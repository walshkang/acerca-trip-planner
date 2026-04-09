# Fix: ResearchTriagePanel silent failures

## Context

`components/stitch/ResearchTriagePanel.tsx` has two issues where errors are swallowed silently.

Read these files first:
- `components/stitch/ResearchTriagePanel.tsx`
- `AGENTS.md`

## Bug 1 — `createResearchList()` silent failure (line ~273)

Current code:
```ts
const json = (await res.json().catch(() => ({}))) as { list?: ListRow; error?: string }
if (!res.ok) return           // ← returns silently, no feedback
if (json.list?.id) { ... }    // ← if res.ok but json.list undefined, also silent
```

**Fix:** Add a `createError` state (`string | null`):
```ts
const [createError, setCreateError] = useState<string | null>(null)
```

In `createResearchList()`:
1. Clear error at start: `setCreateError(null)`
2. On `!res.ok`: `setCreateError(json.error || 'Failed to create list'); return`
3. On `res.ok` but `!json.list?.id`: `setCreateError('Unexpected response'); return`

Render `createError` as a small red text below the create-list input:
```tsx
{createError ? (
  <p className="mt-1 text-xs text-red-500">{createError}</p>
) : null}
```

## Bug 2 — `buildProvenanceNotes` silent truncation (line ~28)

Current code:
```ts
return lines.join('\n').slice(0, 7900)
```

This silently drops content. Not a critical bug, but the API will accept up to 8000 chars (`notes` is sliced to 8000 in the items route).

**Fix:** Truncate with an indicator so the user knows content was cut:
```ts
const joined = lines.join('\n')
if (joined.length > 7900) {
  return joined.slice(0, 7880) + '\n\n[truncated]'
}
return joined
```

## What NOT to change

- Don't refactor or split the component — that's a separate task
- Don't change voting, source attachment, or add-to-trip flows
- Don't add new props or change the component's public API
- Keep the existing visual style consistent

## Verification

Run `npm run check` before committing.
