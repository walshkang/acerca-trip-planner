/**
 * eval:capture — runs all fixtures through extraction + judge, writes scores to evals/scores/.
 *
 * Extractions are cached by label+model in evals/extractions/ — re-runs only judge
 * unless the model changes or --force is passed.
 *
 * Usage:
 *   npm run eval:capture              # use cached extractions if available
 *   npm run eval:capture -- --force   # re-extract everything
 */
import path from 'node:path'
import fs from 'node:fs'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
process.env.RUN_EVALS = '1'

import { extractMergedSocialExtraction, getSocialExtractionModelId, getSocialExtractionOutputMode } from '../lib/server/social/ingest'
import { runJudge, getFailingDimensions, type JudgeScore } from '../lib/server/social/eval-judge'
import type { MergedSocialExtraction } from '../lib/social/extraction-contract'
import { EVAL_FIXTURES } from '../tests/social/evals/fixtures/index'

const JUDGE_MODEL =
  process.env.SOCIAL_EVAL_JUDGE_MODEL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL_EVAL?.trim() ||
  process.env.SOCIAL_EXTRACTION_MODEL?.trim() ||
  'gemini-2.5-flash'

const SCORES_DIR = path.resolve(process.cwd(), 'evals', 'scores')
const EXTRACTIONS_DIR = path.resolve(process.cwd(), 'evals', 'extractions')
const FORCE = process.argv.includes('--force')
const GAP_MS = parseInt(process.env.EVAL_CAPTURE_GAP_MS ?? '4000', 10)

type FixtureResult = JudgeScore & { pass: boolean; failing_dimensions: string[] }
type ScoreFile = {
  timestamp: string
  model: string
  output_mode: string
  judge_model: string
  fixtures: Record<string, FixtureResult>
  summary: {
    total: number; passed: number; failed: number
    avg_recall: number; avg_groundedness: number; avg_persona: number; avg_richness: number
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
    groundedness: avg(fixtures.map((f) => f.groundedness_score)),
    persona: avg(fixtures.map((f) => f.persona_score)),
    richness: avg(fixtures.map((f) => f.richness_score)),
  }
  return Object.entries(avgs).sort(([, a], [, b]) => a - b)[0][0]
}

function extractionCachePath(label: string, model: string): string {
  const safeModel = model.replace(/[^a-z0-9-]/gi, '_')
  return path.join(EXTRACTIONS_DIR, `${label}__${safeModel}.json`)
}

function loadCachedExtraction(label: string, model: string): MergedSocialExtraction | null {
  const p = extractionCachePath(label, model)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as MergedSocialExtraction
  } catch {
    return null
  }
}

function saveCachedExtraction(label: string, model: string, result: MergedSocialExtraction): void {
  fs.mkdirSync(EXTRACTIONS_DIR, { recursive: true })
  fs.writeFileSync(extractionCachePath(label, model), JSON.stringify(result, null, 2))
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const retryMatch = msg.match(/retry in (\d+(\.\d+)?)s/i)
    const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60
    process.stdout.write(` rate-limited, sleeping ${retrySec}s...`)
    await new Promise((r) => setTimeout(r, retrySec * 1000))
    return fn()
  }
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
  console.log(`  Fixtures         : ${EVAL_FIXTURES.length}`)
  console.log(`  Force re-extract : ${FORCE}\n`)

  const fixtureResults: Record<string, FixtureResult> = {}

  for (let i = 0; i < EVAL_FIXTURES.length; i++) {
    const fixture = EVAL_FIXTURES[i]
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS))

    process.stdout.write(`  [${fixture.label}]`)

    // Extraction — use cache unless forced
    let actual = FORCE ? null : loadCachedExtraction(fixture.label, model)
    if (actual) {
      process.stdout.write(` (cached)`)
    } else {
      process.stdout.write(` extracting...`)
      actual = await withRetry(() => extractMergedSocialExtraction(fixture.transcript))
      saveCachedExtraction(fixture.label, model, actual)
    }

    // Judge
    process.stdout.write(` judging...`)
    const scores = await withRetry(() =>
      runJudge({ transcript: fixture.transcript, expected: fixture.expected, actual: actual!, judgeModel: JUDGE_MODEL })
    )

    const failing = getFailingDimensions(scores)
    const pass = failing.length === 0
    process.stdout.write(` ${pass ? '✓' : `✗ (${failing.join(', ')})`}\n`)
    fixtureResults[fixture.label] = { ...scores, pass, failing_dimensions: failing }
  }

  const passed = Object.values(fixtureResults).filter((r) => r.pass).length
  const total = Object.keys(fixtureResults).length
  const scoreFile: ScoreFile = {
    timestamp: new Date().toISOString(),
    model, output_mode: outputMode, judge_model: JUDGE_MODEL,
    fixtures: fixtureResults,
    summary: {
      total, passed, failed: total - passed,
      avg_recall: avg(Object.values(fixtureResults).map((f) => f.recall_score)),
      avg_groundedness: avg(Object.values(fixtureResults).map((f) => f.groundedness_score)),
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
  console.log(`  Avg recall       : ${scoreFile.summary.avg_recall}`)
  console.log(`  Avg groundedness : ${scoreFile.summary.avg_groundedness}`)
  console.log(`  Avg persona      : ${scoreFile.summary.avg_persona}`)
  console.log(`  Avg richness     : ${scoreFile.summary.avg_richness}`)
  console.log(`  Weakest          : ${scoreFile.summary.weakest_dimension}`)
  console.log(`\nScores written to ${path.relative(process.cwd(), outPath)}\n`)
}

main().catch((err) => { console.error(err); process.exit(1) })
