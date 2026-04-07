# Social Extraction Evals — Slice 2: Deterministic Harness

## Goal

Wire the golden dataset fixtures to a Vitest eval suite that makes real Gemini calls and asserts structural correctness. No DB. No HTTP. Pure LLM output shape + sentinel checks.

---

## Files to read first

- `lib/server/social/ingest.ts` — `extractMergedSocialExtraction` (currently unexported)
- `lib/social/extraction-contract.ts` — `mergedSocialExtractionSchema`, `PERSONA_VALUES`
- `tests/social/evals/fixtures/` — all 5 fixture JSON files
- `vitest.config.ts` — confirm alias setup (`@/` → project root)
- `tests/setup-env.ts` — env setup pattern used in other tests

---

## Changes

### 1. Export `extractMergedSocialExtraction` from `lib/server/social/ingest.ts`

Change:

```typescript
async function extractMergedSocialExtraction(transcript: string): Promise<MergedSocialExtraction> {
```

To:

```typescript
export async function extractMergedSocialExtraction(transcript: string): Promise<MergedSocialExtraction> {
```

No other changes to `ingest.ts`.

---

### 2. Create `tests/social/evals/fixtures/index.ts`

```typescript
import happyPath from './happy-path.json'
import firehose from './firehose.json'
import ghostTown from './ghost-town.json'
import negativeReview from './negative-review.json'
import tangent from './tangent.json'
import type { MergedSocialExtraction } from '@/lib/social/extraction-contract'

export type EvalFixture = {
  label: string
  description: string
  transcript: string
  expected: MergedSocialExtraction
}

export const EVAL_FIXTURES: EvalFixture[] = [
  happyPath,
  firehose,
  ghostTown,
  negativeReview,
  tangent,
] as EvalFixture[]
```

---

### 3. Create `tests/social/evals/deterministic.eval.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { extractMergedSocialExtraction } from '@/lib/server/social/ingest'
import { mergedSocialExtractionSchema, PERSONA_VALUES } from '@/lib/social/extraction-contract'
import { EVAL_FIXTURES } from './fixtures/index'

// Gate behind RUN_EVALS env var — these call real Gemini and cost money
const runEvals = !!process.env.RUN_EVALS

describe.skipIf(!runEvals)('deterministic extraction evals', () => {
  it.each(EVAL_FIXTURES)('$label — output is schema-valid', async ({ label, transcript }) => {
    const result = await extractMergedSocialExtraction(transcript)

    // Full schema parse — catches any structural drift
    const parsed = mergedSocialExtractionSchema.safeParse(result)
    if (!parsed.success) {
      throw new Error(
        `[${label}] schema invalid: ${parsed.error.issues.map((i) => i.message).join('; ')}`
      )
    }

    // author_persona is a valid enum value
    expect(PERSONA_VALUES).toContain(result.author_persona)

    // No nulls inside arrays
    expect(result.mentioned_places.every((p) => p !== null && p !== undefined)).toBe(true)
    for (const place of result.mentioned_places) {
      expect(Array.isArray(place.tags)).toBe(true)
      expect(Array.isArray(place.callouts)).toBe(true)
      expect(place.tags!.every((t) => t !== null)).toBe(true)
      expect(place.callouts!.every((c) => c !== null)).toBe(true)
    }
  }, 30_000)

  it('ghost-town — returns empty mentioned_places, no hallucinated filler', async () => {
    const fixture = EVAL_FIXTURES.find((f) => f.label === 'ghost-town')!
    const result = await extractMergedSocialExtraction(fixture.transcript)

    expect(result.mentioned_places).toHaveLength(0)
  }, 30_000)

  it('tangent — extracts exactly 1 place (Museo Jumex), not the 3 mentioned-only places', async () => {
    const fixture = EVAL_FIXTURES.find((f) => f.label === 'tangent')!
    const result = await extractMergedSocialExtraction(fixture.transcript)

    // Must not over-extract
    expect(result.mentioned_places.length).toBeLessThanOrEqual(2)

    // Must include the visited place
    const names = result.mentioned_places.map((p) => p.place_name.toLowerCase())
    expect(names.some((n) => n.includes('jumex'))).toBe(true)
  }, 30_000)

  it('negative-review — Lau Pa Sat and Atlas are not positive sentiment', async () => {
    const fixture = EVAL_FIXTURES.find((f) => f.label === 'negative-review')!
    const result = await extractMergedSocialExtraction(fixture.transcript)

    const lauPaSat = result.mentioned_places.find((p) =>
      p.place_name.toLowerCase().includes('lau pa sat')
    )
    const atlas = result.mentioned_places.find((p) =>
      p.place_name.toLowerCase().includes('atlas')
    )

    // Both must exist and neither should be purely positive
    if (lauPaSat) expect(lauPaSat.sentiment).not.toBe('positive')
    if (atlas) expect(atlas.sentiment).not.toBe('positive')
  }, 30_000)

  it('firehose — extracts at least 12 of 16 places (75% recall floor)', async () => {
    const fixture = EVAL_FIXTURES.find((f) => f.label === 'firehose')!
    const result = await extractMergedSocialExtraction(fixture.transcript)

    expect(result.mentioned_places.length).toBeGreaterThanOrEqual(12)
  }, 60_000)
})
```

---

## Environment setup

These tests require `GOOGLE_GENERATIVE_AI_API_KEY` (or `GOOGLE_PLACES_API_KEY`) to be set.
Model selection precedence:
- when `RUN_EVALS=1`: `SOCIAL_EXTRACTION_MODEL_EVAL` → `SOCIAL_EXTRACTION_MODEL` → default `gemini-1.5-flash`
- otherwise: `SOCIAL_EXTRACTION_MODEL` → default `gemini-1.5-flash`

Do **not** add this key to the test runner env by default. Callers must set it explicitly.

---

## Definition of Done

- [ ] `extractMergedSocialExtraction` is exported from `lib/server/social/ingest.ts`
- [ ] `tests/social/evals/fixtures/index.ts` loads all 5 fixtures without TypeScript errors
- [ ] `RUN_EVALS=1 GOOGLE_GENERATIVE_AI_API_KEY=... npx vitest run tests/social/evals/deterministic.eval.ts` runs and passes
- [ ] Without `RUN_EVALS`, running `npm run test` skips this suite entirely (verify with `npx vitest run tests/social/evals/deterministic.eval.ts` — should show 0 tests run, not failures)
- [ ] `npm run check` passes (no type errors from the new export or fixture imports)
