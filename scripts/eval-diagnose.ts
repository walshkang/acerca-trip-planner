/**
 * eval:diagnose — reads the latest scores file and prints a ranked failure report.
 * Also writes evals/scores/latest-diagnosis.md for pasting into a meta-LLM prompt.
 * Usage: npm run eval:diagnose
 */
import path from 'node:path'
import fs from 'node:fs'
import { JUDGE_THRESHOLDS } from '../lib/server/social/eval-judge'

const SCORES_DIR = path.resolve(process.cwd(), 'evals', 'scores')

type FixtureResult = {
  recall_score: number
  hallucination_score: number
  persona_score: number
  richness_score: number
  reasoning: string
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

function latestScoreFile(): string {
  const files = fs
    .readdirSync(SCORES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'latest-diagnosis.md')
    .sort()
    .reverse()
  if (files.length === 0) {
    console.error('No score files found in evals/scores/. Run npm run eval:capture first.')
    process.exit(1)
  }
  return path.join(SCORES_DIR, files[0])
}

function scoreBar(value: number, max = 100): string {
  const filled = Math.round((value / max) * 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function dimensionStatus(dimension: string, value: number): string {
  const t = JUDGE_THRESHOLDS[dimension as keyof typeof JUDGE_THRESHOLDS]
  const pass = t.direction === 'gte' ? value >= t.min : value <= t.min
  return pass ? '✓' : '✗'
}

function formatScore(dimension: string, value: number): string {
  const t = JUDGE_THRESHOLDS[dimension as keyof typeof JUDGE_THRESHOLDS]
  const pass = t.direction === 'gte' ? value >= t.min : value <= t.min
  return pass ? `${value}` : `${value} ← below ${t.min}`
}

function main() {
  const filePath = process.argv[2] ?? latestScoreFile()
  const data: ScoreFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  const date = new Date(data.timestamp).toISOString().slice(0, 10)
  const lines: string[] = []

  const header = [
    `EVAL DIAGNOSIS — ${date}`,
    `Model: ${data.model} | Mode: ${data.output_mode} | Judge: ${data.judge_model}`,
    `Result: ${data.summary.passed}/${data.summary.total} passed`,
  ]
  lines.push(...header, '')

  // Score table
  lines.push('SCORES')
  lines.push(
    `${'fixture'.padEnd(20)} ${'recall'.padStart(7)} ${'halluc'.padStart(7)} ${'persona'.padStart(8)} ${'richness'.padStart(9)}  pass`
  )
  lines.push('─'.repeat(62))

  const thresholdRow = [
    '(threshold)'.padEnd(20),
    `≥${JUDGE_THRESHOLDS.recall.min}`.padStart(7),
    `≤${JUDGE_THRESHOLDS.hallucination.min}`.padStart(7),
    `≥${JUDGE_THRESHOLDS.persona.min}`.padStart(8),
    `≥${JUDGE_THRESHOLDS.richness.min}`.padStart(9),
    '',
  ]
  lines.push(thresholdRow.join(' '))

  for (const [label, result] of Object.entries(data.fixtures)) {
    const row = [
      label.padEnd(20),
      String(result.recall_score).padStart(7),
      String(result.hallucination_score).padStart(7),
      String(result.persona_score).padStart(8),
      String(result.richness_score).padStart(9),
      result.pass ? ' ✓' : ` ✗ ${result.failing_dimensions.join(', ')}`,
    ]
    lines.push(row.join(' '))
  }

  lines.push('─'.repeat(62))
  const avgRow = [
    'AVERAGE'.padEnd(20),
    String(data.summary.avg_recall).padStart(7),
    String(data.summary.avg_hallucination).padStart(7),
    String(data.summary.avg_persona).padStart(8),
    String(data.summary.avg_richness).padStart(9),
    '',
  ]
  lines.push(avgRow.join(' '))
  lines.push('')

  // Failures
  const failures = Object.entries(data.fixtures).filter(([, r]) => !r.pass)
  if (failures.length === 0) {
    lines.push('FAILURES: none — all fixtures passing')
  } else {
    lines.push(`FAILURES (${failures.length})`)
    lines.push('')
    for (const [label, result] of failures) {
      lines.push(`${label} — failing: ${result.failing_dimensions.join(', ')}`)
      lines.push(`  recall=${result.recall_score} halluc=${result.hallucination_score} persona=${result.persona_score} richness=${result.richness_score}`)
      lines.push(`  Judge: "${result.reasoning}"`)
      lines.push('')
    }
  }

  // Dimension averages ranked worst to best
  const dimAvgs = [
    { dim: 'recall', avg: data.summary.avg_recall, threshold: JUDGE_THRESHOLDS.recall.min, direction: 'gte' as const },
    { dim: 'hallucination', avg: data.summary.avg_hallucination, threshold: JUDGE_THRESHOLDS.hallucination.min, direction: 'lte' as const },
    { dim: 'persona', avg: data.summary.avg_persona, threshold: JUDGE_THRESHOLDS.persona.min, direction: 'gte' as const },
    { dim: 'richness', avg: data.summary.avg_richness, threshold: JUDGE_THRESHOLDS.richness.min, direction: 'gte' as const },
  ].sort((a, b) => {
    const margin = (d: typeof a) => d.direction === 'gte' ? d.avg - d.threshold : d.threshold - d.avg
    return margin(a) - margin(b)
  })

  lines.push('DIMENSION HEALTH (worst → best margin from threshold)')
  for (const { dim, avg, threshold, direction } of dimAvgs) {
    const margin = direction === 'gte' ? avg - threshold : threshold - avg
    const status = margin >= 0 ? '✓' : '✗'
    lines.push(`  ${status} ${dim.padEnd(14)} avg ${avg} (${margin >= 0 ? '+' : ''}${margin} from threshold ${threshold})`)
  }
  lines.push('')

  lines.push(`WEAKEST DIMENSION: ${data.summary.weakest_dimension}`)
  lines.push('')

  // Prompt improvement context block (for pasting into meta-LLM)
  lines.push('─'.repeat(62))
  lines.push('PROMPT IMPROVEMENT CONTEXT (paste into meta-LLM)')
  lines.push('─'.repeat(62))
  lines.push('')
  lines.push('The following fixtures are failing. For each, the judge explained why.')
  lines.push('Use this to suggest targeted changes to SYSTEM_PROMPT in lib/server/social/ingest.ts.')
  lines.push('')
  if (failures.length === 0) {
    lines.push('No failures — consider tightening thresholds or adding harder fixtures.')
  } else {
    for (const [label, result] of failures) {
      lines.push(`Fixture: ${label}`)
      lines.push(`Failing: ${result.failing_dimensions.join(', ')}`)
      lines.push(`Judge reasoning: ${result.reasoning}`)
      lines.push('')
    }
  }

  const output = lines.join('\n')
  console.log(output)

  // Write diagnosis file
  const diagPath = path.join(SCORES_DIR, 'latest-diagnosis.md')
  fs.writeFileSync(diagPath, output)
  console.log(`\nDiagnosis written to ${path.relative(process.cwd(), diagPath)}`)
}

main()
