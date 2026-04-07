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
    '$label - recall >= 75, hallucination <= 20, vibe >= 70',
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
