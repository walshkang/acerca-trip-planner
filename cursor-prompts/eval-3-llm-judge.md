# Social Extraction Evals — Slice 3: LLM Judge

## Goal

Add a semantic eval layer on top of the deterministic harness. For each fixture, call Gemini Flash with a scoring prompt that compares the actual extraction to the expected output and returns structured scores for recall, hallucination, and vibe alignment.

Also fix the system prompt gap that causes over-extraction of historically-mentioned (unvisited) places.

---

## Files to read first

- `lib/server/social/ingest.ts` — `SYSTEM_PROMPT`, `CHUNK_SYSTEM_PROMPT`, `getSocialExtractionModelId`
- `tests/social/evals/deterministic.eval.ts` — eval pattern to follow
- `tests/social/evals/fixtures/index.ts` — `EVAL_FIXTURES`, `EvalFixture` type
- `lib/social/extraction-contract.ts` — `MergedSocialExtraction` type

---

## Changes

### 1. Fix two system prompt gaps in `lib/server/social/ingest.ts`

In both `SYSTEM_PROMPT` and `CHUNK_SYSTEM_PROMPT`, add both lines before `.trim()`:

```
Only extract places the creator personally visited, reviewed, or directly recommends — not places mentioned historically, aspirationally, or in passing without a visit.
Only include a place if you can quote at least 2 sentences of direct experience from the transcript. Skip places that are merely name-checked or visited so briefly that no meaningful opinion is expressed.
```

**Gap 1 — visited vs mentioned:** The current prompts say "Only include real, specific establishments" but say nothing about *visited vs mentioned*. This causes over-extraction on the `tangent` fixture (Casa Barragan, Fundacion Casa Wabi, Museo Soumaya all get extracted when only Museo Jumex was visited).

**Gap 2 — name-checks:** Real transcripts produce thin extractions for landmarks/shops visited in passing (e.g. "Nintendo NYC.", "MoMA.", "And of course we had to check out the New York Public Library."). These clutter results with zero-callout, generic-tag entries that don't help users. The 2-sentence rule kills them cleanly.

**Do not** add a minimum character count to the schema — enforce this in the prompt, not the contract, so the contract stays a pure shape validator.

---

### 2. Create `tests/social/evals/judge.eval.ts`

```typescript
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { extractMergedSocialExtraction } from '@/lib/server/social/ingest'
import type { MergedSocialExtraction } from '@/lib/social/extraction-contract'
import { EVAL_FIXTURES } from './fixtures/index'

const runEvals = !!process.env.RUN_EVALS

const JUDGE_MODEL =
  process.env.SOCIAL_EVAL_JUDGE_MODEL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL_EVAL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL?.trim() ||
  'gemini-2.5-flash'

const judgeScoreSchema = z.object({
  recall_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Percentage of expected places that appear in actual output (by name, fuzzy match ok). 100 = all expected places present.'
    ),
  hallucination_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Penalty score: percentage of actual places NOT supported by the transcript. 0 = no hallucinations. 100 = all hallucinated.'
    ),
  vibe_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'How well do the actual tags and sentiment capture the same vibe as expected tags and sentiment? 100 = perfect alignment.'
    ),
  reasoning: z.string().describe('1-3 sentence explanation of the scores.'),
})

type JudgeScore = z.infer<typeof judgeScoreSchema>

const JUDGE_SYSTEM_PROMPT = `
You are evaluating the output of a place extraction AI that processes travel video transcripts.
You will be given: the original transcript, the expected extraction, and the actual extraction.
Score the actual extraction on three dimensions and return valid JSON.
Be strict: missing places hurt recall, invented places hurt hallucination, wrong vibes hurt vibe score.
`.trim()

async function judgeExtraction(params: {
  transcript: string
  expected: MergedSocialExtraction
  actual: MergedSocialExtraction
}): Promise<JudgeScore> {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
  })

  const prompt = `
TRANSCRIPT:
${params.transcript}

EXPECTED EXTRACTION:
${JSON.stringify(params.expected, null, 2)}

ACTUAL EXTRACTION:
${JSON.stringify(params.actual, null, 2)}

Score the actual extraction.
`.trim()

  const result = await generateObject({
    model: google(JUDGE_MODEL),
    schema: judgeScoreSchema,
    system: JUDGE_SYSTEM_PROMPT,
    prompt,
    temperature: 0,
  })

  return result.object
}

describe.skipIf(!runEvals)('semantic extraction evals (LLM judge)', () => {
  it.each(EVAL_FIXTURES)(
    '$label — recall ≥ 75, hallucination ≤ 20, vibe ≥ 70',
    async ({ label, transcript, expected }) => {
      const actual = await extractMergedSocialExtraction(transcript)
      const scores = await judgeExtraction({ transcript, expected, actual })

      console.log(`[${label}] judge scores:`, {
        recall: scores.recall_score,
        hallucination: scores.hallucination_score,
        vibe: scores.vibe_score,
        reasoning: scores.reasoning,
      })

      expect(scores.recall_score, `recall too low: ${scores.reasoning}`).toBeGreaterThanOrEqual(75)
      expect(
        scores.hallucination_score,
        `hallucination too high: ${scores.reasoning}`
      ).toBeLessThanOrEqual(20)
      expect(scores.vibe_score, `vibe misaligned: ${scores.reasoning}`).toBeGreaterThanOrEqual(70)
    },
    90_000
  )
})
```

---

## Score thresholds rationale

| Metric | Threshold | Why |
|--------|-----------|-----|
| Recall ≥ 75 | Lenient enough for ambiguous fixture cases (e.g. firehose borderline spots) | |
| Hallucination ≤ 20 | Allows 1 borderline extraction per ~5 places before failing | |
| Vibe ≥ 70 | Tags are fuzzy — "hidden gem" vs "locals-spot" is acceptable drift | |

Tighten thresholds once the prompt is stable (target: recall ≥ 85, hallucination ≤ 10).

---

## Definition of Done

- [ ] `SYSTEM_PROMPT` and `CHUNK_SYSTEM_PROMPT` in `ingest.ts` include both the visited-vs-mentioned instruction and the 2-sentence rule
- [ ] `RUN_EVALS=1 GOOGLE_GENERATIVE_AI_API_KEY=... npx vitest run tests/social/evals/judge.eval.ts` runs and passes all 5 fixtures
- [ ] `tangent` fixture passes with ≤ 2 places extracted (visited-vs-mentioned fix confirmed)
- [ ] Re-running on the real NYC transcript no longer extracts Nintendo NYC, MoMA, or New York Public Library (2-sentence rule confirmed)
- [ ] Judge scores are logged to console for manual inspection
- [ ] `npm run check` passes
