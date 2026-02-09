import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const plansRoot = path.join(rootDir, 'docs', 'plans')

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    errors.push(`${path.relative(rootDir, filePath)}: invalid JSON (${error instanceof Error ? error.message : 'unknown error'})`)
    return null
  }
}

function validateFlowchart(flowchart, relPath, errors) {
  if (!isObject(flowchart)) {
    errors.push(`${relPath}: root must be an object`)
    return
  }

  if (!Array.isArray(flowchart.nodes) || flowchart.nodes.length === 0) {
    errors.push(`${relPath}: nodes must be a non-empty array`)
    return
  }
  if (!Array.isArray(flowchart.edges)) {
    errors.push(`${relPath}: edges must be an array`)
    return
  }

  const validNodeTypes = new Set(['start', 'process', 'decision', 'end'])
  const nodeIds = new Set()

  flowchart.nodes.forEach((node, index) => {
    if (!isObject(node)) {
      errors.push(`${relPath}: nodes[${index}] must be an object`)
      return
    }
    if (typeof node.id !== 'string' || node.id.trim() === '') {
      errors.push(`${relPath}: nodes[${index}].id must be a non-empty string`)
      return
    }
    if (nodeIds.has(node.id)) {
      errors.push(`${relPath}: duplicate node id '${node.id}'`)
    }
    nodeIds.add(node.id)

    if (typeof node.label !== 'string' || node.label.trim() === '') {
      errors.push(`${relPath}: nodes[${index}].label must be a non-empty string`)
    }
    if (!validNodeTypes.has(node.type)) {
      errors.push(`${relPath}: nodes[${index}].type must be one of start|process|decision|end`)
    }
  })

  flowchart.edges.forEach((edge, index) => {
    if (!isObject(edge)) {
      errors.push(`${relPath}: edges[${index}] must be an object`)
      return
    }
    if (typeof edge.from !== 'string' || edge.from.trim() === '') {
      errors.push(`${relPath}: edges[${index}].from must be a non-empty string`)
      return
    }
    if (typeof edge.to !== 'string' || edge.to.trim() === '') {
      errors.push(`${relPath}: edges[${index}].to must be a non-empty string`)
      return
    }
    if (!nodeIds.has(edge.from)) {
      errors.push(`${relPath}: edges[${index}].from '${edge.from}' does not exist in nodes`)
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`${relPath}: edges[${index}].to '${edge.to}' does not exist in nodes`)
    }
    if (edge.label !== undefined && typeof edge.label !== 'string') {
      errors.push(`${relPath}: edges[${index}].label must be a string when provided`)
    }
  })
}

function validateComponent(component, relPath, trail, errors) {
  if (!isObject(component)) {
    errors.push(`${relPath}: ${trail} must be an object`)
    return
  }

  const validTypes = new Set(['container', 'button', 'text', 'input', 'image'])
  if (!validTypes.has(component.type)) {
    errors.push(`${relPath}: ${trail}.type must be one of container|button|text|input|image`)
  }

  if (component.content !== undefined && typeof component.content !== 'string') {
    errors.push(`${relPath}: ${trail}.content must be a string when provided`)
  }

  if (component.style !== undefined && !isObject(component.style)) {
    errors.push(`${relPath}: ${trail}.style must be an object when provided`)
  }

  if (component.children !== undefined) {
    if (!Array.isArray(component.children)) {
      errors.push(`${relPath}: ${trail}.children must be an array when provided`)
      return
    }
    component.children.forEach((child, index) => {
      validateComponent(child, relPath, `${trail}.children[${index}]`, errors)
    })
  }
}

function validateMockup(mockup, relPath, errors) {
  if (!isObject(mockup)) {
    errors.push(`${relPath}: root must be an object`)
    return
  }
  if (!isObject(mockup.states) || Object.keys(mockup.states).length === 0) {
    errors.push(`${relPath}: states must be a non-empty object`)
    return
  }

  for (const [stateName, rootComponent] of Object.entries(mockup.states)) {
    validateComponent(rootComponent, relPath, `states.${stateName}`, errors)
  }
}

function getFeatureDirs() {
  if (!fs.existsSync(plansRoot)) return []
  return fs
    .readdirSync(plansRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(plansRoot, entry.name))
}

const errors = []
const featureDirs = getFeatureDirs()

for (const dir of featureDirs) {
  const relDir = path.relative(rootDir, dir)
  const flowchartPath = path.join(dir, 'flowchart.json')
  const mockupPath = path.join(dir, 'mockup.json')
  const planPath = path.join(dir, 'plan.md')

  if (!fs.existsSync(planPath)) {
    errors.push(`${relDir}/plan.md: missing file`)
  }
  if (!fs.existsSync(flowchartPath)) {
    errors.push(`${relDir}/flowchart.json: missing file`)
  }
  if (!fs.existsSync(mockupPath)) {
    errors.push(`${relDir}/mockup.json: missing file`)
  }

  if (fs.existsSync(flowchartPath)) {
    const flowchart = readJson(flowchartPath, errors)
    if (flowchart) {
      validateFlowchart(flowchart, path.relative(rootDir, flowchartPath), errors)
    }
  }

  if (fs.existsSync(mockupPath)) {
    const mockup = readJson(mockupPath, errors)
    if (mockup) {
      validateMockup(mockup, path.relative(rootDir, mockupPath), errors)
    }
  }
}

if (errors.length > 0) {
  console.error('Plan validation failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

if (featureDirs.length === 0) {
  console.log('Plan validation passed (no plan directories found under docs/plans).')
} else {
  console.log(`Plan validation passed (${featureDirs.length} plan director${featureDirs.length === 1 ? 'y' : 'ies'}).`)
}
