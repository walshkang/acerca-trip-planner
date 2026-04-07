import { describe, expect, it } from 'vitest'
import { extractMergedSocialExtraction } from '@/lib/server/social/ingest'
import { runJudge, getFailingDimensions, JUDGE_THRESHOLDS } from '@/lib/server/social/eval-judge'
import { EVAL_FIXTURES } from './fixtures/index'

const runEvals = !!process.env.RUN_EVALS
const OUTPUT_MODE = process.env.SOCIAL_EXTRACTION_OUTPUT_MODE?.trim() || 'native-json'
const JUDGE_MODEL =
  process.env.SOCIAL_EVAL_JUDGE_MODEL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL_EVAL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL?.trim() ||
  'gemini-2.5-flash'

describe.skipIf(!runEvals)('semantic extraction evals (LLM judge)', () => {
  it('logs extraction output mode for transparency', () => {
    console.log(`[judge eval] extraction output mode: ${OUTPUT_MODE}`)
    expect(['native-json', 'text-json-fallback']).toContain(OUTPUT_MODE)
  })

  it.each(EVAL_FIXTURES)(
    '$label — recall ≥ 75, groundedness ≥ 80, persona ≥ 75, richness ≥ 70',
    async ({ label, transcript, expected }) => {
      const actual = await extractMergedSocialExtraction(transcript)
      const scores = await runJudge({ transcript, expected, actual, judgeModel: JUDGE_MODEL })
      const failing = getFailingDimensions(scores)

      console.log(`[${label}] judge scores:`, {
        recall: scores.recall_score,
        groundedness: scores.groundedness_score,
        persona: scores.persona_score,
        richness: scores.richness_score,
        reasoning: scores.reasoning,
      })

      expect(
        scores.recall_score,
        `recall too low: ${scores.reasoning}`
      ).toBeGreaterThanOrEqual(JUDGE_THRESHOLDS.recall.min)
      expect(
        scores.groundedness_score,
        `groundedness too low: ${scores.reasoning}`
      ).toBeGreaterThanOrEqual(JUDGE_THRESHOLDS.groundedness.min)
      expect(
        scores.persona_score,
        `persona misclassified: ${scores.reasoning}`
      ).toBeGreaterThanOrEqual(JUDGE_THRESHOLDS.persona.min)
      expect(
        scores.richness_score,
        `callouts/tags too generic: ${scores.reasoning}`
      ).toBeGreaterThanOrEqual(JUDGE_THRESHOLDS.richness.min)

      if (failing.length > 0) {
        console.warn(`[${label}] failing dimensions: ${failing.join(', ')}`)
      }
    },
    90_000
  )
})
