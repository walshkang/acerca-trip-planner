/**
 * eval:capture — runs all fixtures through extraction + judge, writes scores to evals/scores/.
 * Usage: GOOGLE_GENERATIVE_AI_API_KEY=... npm run eval:capture
 */
import path from 'node:path'
import fs from 'node:fs'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

// Must set after env load so model/mode env vars are available
process.env.RUN_EVALS = '1'

import { extractMergedSocialExtraction, getSocialExtractionModelId, getSocialExtractionOutputMode } from '../lib/server/social/ingest'
import { runJudge, getFailingDimensions, JUDGE_THRESHOLDS, type JudgeScore } from '../lib/server/social/eval-judge'
import { EVAL_FIXTURES } from '../tests/social/evals/fixtures/index'

const JUDGE_MODEL =
  process.env.SOCIAL_EVAL_JUDGE_MODEL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL_EVAL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL?.trim() ||
  'gemini-2.5-flash'

const SCORES_DIR = path.resolve(process.cwd(), 'evals', 'scores')

type FixtureResult = JudgeScore & {
  pass: boolean
  failing_dimensions: string[]
}

type ScoreFile = {
  timestamp: string
  model: string
  output_mode: string
  judge_model: string
  fixtures: Record<string, FixtureResult>
  summary: {
    total: number
    passed: number
    failed: number
    avg_recall: number
    avg_hallucination: number
    avg_persona: number
    avg_richness: number
    weakest_dimension: string
  }
}

function avg(values: number[]): number {
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

function weakestDimension(results: Record<string, FixtureResult>): string {
  const fixtures = Object.values(results)
  const avgs = {
    recall: avg(fixtures.map((f) => f.recall_score)),
    hallucination: 100 - avg(fixtures.map((f) => f.hallucination_score)), // invert so lower = worse
    persona: avg(fixtures.map((f) => f.persona_score)),
    richness: avg(fixtures.map((f) => f.richness_score)),
  }
  return Object.entries(avgs).sort(([, a], [, b]) => a - b)[0][0]
}

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_PLACES_API_KEY) {
    console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY is required')
    process.exit(1)
  }

  const model = getSocialExtractionModelId()
  const outputMode = getSocialExtractionOutputMode()

  console.log(`\nEval capture`)
  console.log(`  Extraction model : ${model} (${outputMode})`)
  console.log(`  Judge model      : ${JUDGE_MODEL}`)
  console.log(`  Fixtures         : ${EVAL_FIXTURES.length}\n`)

  const fixtureResults: Record<string, FixtureResult> = {}

  // Process in batches of 2 to respect rate limits
  const CONCURRENT = 2
  for (let i = 0; i < EVAL_FIXTURES.length; i += CONCURRENT) {
    const batch = EVAL_FIXTURES.slice(i, i + CONCURRENT)
    await Promise.all(
      batch.map(async (fixture) => {
        process.stdout.write(`  [${fixture.label}] extracting...`)
        const actual = await extractMergedSocialExtraction(fixture.transcript)
        process.stdout.write(` judging...`)
        const scores = await runJudge({
          transcript: fixture.transcript,
          expected: fixture.expected,
          actual,
          judgeModel: JUDGE_MODEL,
        })
        const failing = getFailingDimensions(scores)
        const pass = failing.length === 0
        process.stdout.write(` ${pass ? '✓' : `✗ (${failing.join(', ')})`}\n`)
        fixtureResults[fixture.label] = { ...scores, pass, failing_dimensions: failing }
      })
    )
  }

  const passed = Object.values(fixtureResults).filter((r) => r.pass).length
  const total = Object.keys(fixtureResults).length

  const scoreFile: ScoreFile = {
    timestamp: new Date().toISOString(),
    model,
    output_mode: outputMode,
    judge_model: JUDGE_MODEL,
    fixtures: fixtureResults,
    summary: {
      total,
      passed,
      failed: total - passed,
      avg_recall: avg(Object.values(fixtureResults).map((f) => f.recall_score)),
      avg_hallucination: avg(Object.values(fixtureResults).map((f) => f.hallucination_score)),
      avg_persona: avg(Object.values(fixtureResults).map((f) => f.persona_score)),
      avg_richness: avg(Object.values(fixtureResults).map((f) => f.richness_score)),
      weakest_dimension: weakestDimension(fixtureResults),
    },
  }

  fs.mkdirSync(SCORES_DIR, { recursive: true })
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
  const outPath = path.join(SCORES_DIR, filename)
  fs.writeFileSync(outPath, JSON.stringify(scoreFile, null, 2))

  console.log(`\nSummary: ${passed}/${total} passed`)
  console.log(`  Avg recall      : ${scoreFile.summary.avg_recall}`)
  console.log(`  Avg hallucinate : ${scoreFile.summary.avg_hallucination}`)
  console.log(`  Avg persona     : ${scoreFile.summary.avg_persona}`)
  console.log(`  Avg richness    : ${scoreFile.summary.avg_richness}`)
  console.log(`  Weakest         : ${scoreFile.summary.weakest_dimension}`)
  console.log(`\nScores written to ${path.relative(process.cwd(), outPath)}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
