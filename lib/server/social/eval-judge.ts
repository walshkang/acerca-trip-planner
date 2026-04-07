import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import type { MergedSocialExtraction } from '@/lib/social/extraction-contract'

export const judgeScoreSchema = z.object({
  recall_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Percentage of expected places present in actual output (fuzzy name match ok). 100 = all expected places found.'
    ),
  hallucination_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Penalty: percentage of actual places not supported by the transcript. 0 = no hallucinations, 100 = all hallucinated.'
    ),
  persona_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Does the assigned author_persona match the evidence in the transcript? 100 = clearly supported by the language and focus of the content. 0 = wrong or contradicted.'
    ),
  richness_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Are callouts and tags specific and grounded in the transcript — not generic? 100 = callouts name specific items verbatim, tags capture genuine distinctive attributes. 0 = generic, vague, or invented.'
    ),
  reasoning: z.string().describe('2-4 sentences covering all four dimensions.'),
})

export type JudgeScore = z.infer<typeof judgeScoreSchema>

export const JUDGE_THRESHOLDS = {
  recall: { min: 75, direction: 'gte' as const },
  hallucination: { min: 20, direction: 'lte' as const },
  persona: { min: 75, direction: 'gte' as const },
  richness: { min: 70, direction: 'gte' as const },
}

export type JudgeDimension = keyof typeof JUDGE_THRESHOLDS

export function getFailingDimensions(scores: JudgeScore): JudgeDimension[] {
  const failing: JudgeDimension[] = []
  if (scores.recall_score < JUDGE_THRESHOLDS.recall.min) failing.push('recall')
  if (scores.hallucination_score > JUDGE_THRESHOLDS.hallucination.min) failing.push('hallucination')
  if (scores.persona_score < JUDGE_THRESHOLDS.persona.min) failing.push('persona')
  if (scores.richness_score < JUDGE_THRESHOLDS.richness.min) failing.push('richness')
  return failing
}

export const JUDGE_SYSTEM_PROMPT = `
You are evaluating a place extraction AI that processes travel video transcripts.
You will receive: the original transcript, the expected extraction, and the actual extraction.
Score the actual extraction on four dimensions. Be strict and evidence-based — every score must be grounded in the transcript text.

Persona rubric (for persona_score):
- local: hidden gems, avoiding tourist traps, neighborhood insider knowledge
- luxury: price points, exclusivity, high-end service or products
- budget: value focus, affordable finds, cost-conscious choices
- design: architecture, interior aesthetics, visual composition
- foodie: flavor profiles, ingredients, culinary technique, chef focus
- adventure: outdoor activities, physical experiences, exploration
- family: kid-friendly, group logistics, family-oriented experiences
- nightlife: bars, clubs, late-night scene, drinks-forward
`.trim()

export async function runJudge(params: {
  transcript: string
  expected: MergedSocialExtraction
  actual: MergedSocialExtraction
  judgeModel: string
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

Score the actual extraction on all four dimensions.
`.trim()

  const result = await generateObject({
    model: google(params.judgeModel, { thinkingConfig: { thinkingBudget: 0 } }),
    schema: judgeScoreSchema,
    system: JUDGE_SYSTEM_PROMPT,
    prompt,
    temperature: 0,
  })

  return result.object
}
