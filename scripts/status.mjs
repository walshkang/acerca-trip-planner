import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const contextPath = path.join(rootDir, 'CONTEXT.md')
const qualityGatesPath = path.join(rootDir, 'docs', 'QUALITY_GATES.md')
const e2eDir = path.join(rootDir, 'tests', 'e2e')

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf8')
}

function extractLine(content, prefix) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith(prefix))
  if (!line) return null
  return line.trim().replace(prefix, '').trim()
}

function getE2EPauseStatus() {
  if (!fs.existsSync(e2eDir)) {
    return { totalSpecs: 0, skippedSpecs: 0, paused: false }
  }

  const specs = fs
    .readdirSync(e2eDir)
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => path.join(e2eDir, name))

  let skippedSpecs = 0
  for (const spec of specs) {
    const content = fs.readFileSync(spec, 'utf8')
    if (
      content.includes(
        "test.skip(true, 'Playwright seeded E2E is temporarily descoped.'"
      )
    ) {
      skippedSpecs += 1
    }
  }

  return {
    totalSpecs: specs.length,
    skippedSpecs,
    paused: specs.length > 0 && skippedSpecs === specs.length,
  }
}

const context = readFileIfExists(contextPath)
const qualityGatesExists = fs.existsSync(qualityGatesPath)
const e2eStatus = getE2EPauseStatus()

const phase = context
  ? extractLine(context, '- Current Phase:') ?? 'unknown'
  : 'missing CONTEXT.md'
const blocker = context
  ? extractLine(context, '- Immediate Blocker:') ?? 'none listed'
  : 'missing CONTEXT.md'

console.log('Acerca status')
console.log(`- Current phase: ${phase}`)
console.log(`- Immediate blocker: ${blocker}`)
console.log(
  `- Seeded Playwright E2E: ${e2eStatus.paused ? 'paused' : 'active/partial'} (${e2eStatus.skippedSpecs}/${e2eStatus.totalSpecs} specs globally skipped)`
)
console.log(
  `- Quality gate doc: ${qualityGatesExists ? 'present' : 'missing'} (docs/QUALITY_GATES.md)`
)
console.log('- Core checks: npm run check')
console.log('- Optional report generation: npm run report:generate')
