import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()

function parseFeatureArg(argv) {
  const featureIndex = argv.findIndex((arg) => arg === '--feature')
  if (featureIndex !== -1 && argv[featureIndex + 1]) {
    return argv[featureIndex + 1]
  }

  const compactArg = argv.find((arg) => arg.startsWith('--feature='))
  if (compactArg) {
    return compactArg.split('=')[1]
  }

  return null
}

function toSlug(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const featureRaw = parseFeatureArg(process.argv.slice(2))
if (!featureRaw) {
  console.error('Missing required argument: --feature <name>')
  process.exit(1)
}

const feature = toSlug(featureRaw)
if (!feature) {
  console.error('Feature name produced an empty slug. Use letters or numbers.')
  process.exit(1)
}

const planDir = path.join(rootDir, 'docs', 'plans', feature)
if (fs.existsSync(planDir)) {
  console.error(`Plan directory already exists: ${path.relative(rootDir, planDir)}`)
  process.exit(1)
}

fs.mkdirSync(planDir, { recursive: true })

const flowchart = {
  version: '1',
  nodes: [
    { id: 'start', label: 'User starts flow', type: 'start' },
    { id: 'process_main', label: 'Main process', type: 'process' },
    { id: 'decision_valid', label: 'Is input valid?', type: 'decision' },
    { id: 'end_success', label: 'Success', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'process_main', label: 'Begin' },
    { from: 'process_main', to: 'decision_valid', label: 'Process complete' },
    { from: 'decision_valid', to: 'end_success', label: 'Yes' },
  ],
}

const mockup = {
  version: '1',
  states: {
    default: {
      type: 'container',
      style: { padding: 16, direction: 'column', gap: 12 },
      children: [
        {
          type: 'text',
          content: 'Feature title',
          style: { fontSize: 20, weight: 'semibold' },
        },
        {
          type: 'container',
          style: { direction: 'row', gap: 8 },
          children: [
            { type: 'input', content: 'Type input here' },
            { type: 'button', content: 'Submit' },
          ],
        },
      ],
    },
    loading: {
      type: 'container',
      style: { padding: 16 },
      children: [{ type: 'text', content: 'Loading...' }],
    },
    error: {
      type: 'container',
      style: { padding: 16 },
      children: [{ type: 'text', content: 'Something went wrong.' }],
    },
  },
}

const planMd = `# ${feature}\n\n## Goal\n- Define the planning intent and boundaries before implementation.\n\n## Non-Goals\n- No implementation details here.\n\n## Invariants\n- Respect repo invariants from AGENTS.md.\n\n## Verification\n- Run \`npm run plan:validate\` after editing plan artifacts.\n`

fs.writeFileSync(path.join(planDir, 'flowchart.json'), `${JSON.stringify(flowchart, null, 2)}\n`)
fs.writeFileSync(path.join(planDir, 'mockup.json'), `${JSON.stringify(mockup, null, 2)}\n`)
fs.writeFileSync(path.join(planDir, 'plan.md'), planMd)

console.log(`Created plan scaffold: ${path.relative(rootDir, planDir)}`)
