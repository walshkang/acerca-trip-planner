import { generateObject, generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import type { MergedSocialExtraction } from '@/lib/social/extraction-contract'

// All four dimensions are higher=better for consistent scoring across models.
// groundedness replaces the old hallucination_score (which was inverted and confused Gemma).
export const judgeScoreSchema = z.object({
  recall_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Percentage of expected places present in actual output (fuzzy name match ok). 100 = all expected places found, 0 = none found.'
    ),
  groundedness_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'How well-supported are the extracted places and details by the transcript? 100 = every place and detail is directly supported by the transcript text. 0 = places or details are invented or not mentioned.'
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
  groundedness: { min: 80, direction: 'gte' as const },
  persona: { min: 75, direction: 'gte' as const },
  richness: { min: 70, direction: 'gte' as const },
}

export type JudgeDimension = keyof typeof JUDGE_THRESHOLDS

export function getFailingDimensions(scores: JudgeScore): JudgeDimension[] {
  const failing: JudgeDimension[] = []
  if (scores.recall_score < JUDGE_THRESHOLDS.recall.min) failing.push('recall')
  if (scores.groundedness_score < JUDGE_THRESHOLDS.groundedness.min) failing.push('groundedness')
  if (scores.persona_score < JUDGE_THRESHOLDS.persona.min) failing.push('persona')
  if (scores.richness_score < JUDGE_THRESHOLDS.richness.min) failing.push('richness')
  return failing
}

export const JUDGE_SYSTEM_PROMPT = `
You are evaluating a place extraction AI that processes travel video transcripts.
You will receive: the original transcript, the expected extraction, and the actual extraction.
Score the actual extraction on four dimensions. All scores are 0–100 where higher is always better.

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

Score the actual extraction on all four dimensions. All scores are 0–100 where higher is always better.
`.trim()

  const isGemma = params.judgeModel.toLowerCase().startsWith('gemma')

  if (!isGemma) {
    const result = await generateObject({
      model: google(params.judgeModel, { thinkingConfig: { thinkingBudget: 0 } }),
      schema: judgeScoreSchema,
      system: JUDGE_SYSTEM_PROMPT,
      prompt,
      temperature: 0,
    })
    return result.object
  }

  // Gemma: text fallback — no native JSON schema support
  const schemaHint = `{"recall_score":0-100,"groundedness_score":0-100,"persona_score":0-100,"richness_score":0-100,"reasoning":"string"}`
  const generated = await generateText({
    model: google(params.judgeModel),
    system: `${JUDGE_SYSTEM_PROMPT}\n\nStart your response with { and end with }. No markdown, no backticks.\nJSON shape: ${schemaHint}`,
    prompt,
    temperature: 0,
  })

  const raw = generated.text.trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  const json = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
  const parsed = judgeScoreSchema.safeParse(JSON.parse(json))
  if (!parsed.success) {
    throw new Error(`judge_parse_failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
  }
  return parsed.data
}
