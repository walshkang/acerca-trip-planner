import fs from 'node:fs'
import path from 'node:path'

type Position = [number, number]
type Ring = Position[]
type Polygon = Ring[]
type MultiPolygon = Polygon[]

type Feature = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: Polygon | MultiPolygon
  }
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Feature[]
}

type PointFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: {
      type: 'Point'
      coordinates: Position
    }
  }>
}

const INPUT_PATH = path.join(
  process.cwd(),
  'public',
  'map',
  'overlays',
  'nyc_neighborhood_boundaries.geojson'
)
const OUTPUT_PATH = path.join(
  process.cwd(),
  'public',
  'map',
  'overlays',
  'nyc_neighborhood_labels.geojson'
)

const PRECISION = 1.0
const SQRT2 = Math.SQRT2

function getSegDistSq(px: number, py: number, a: Position, b: Position) {
  let x = a[0]
  let y = a[1]
  let dx = b[0] - x
  let dy = b[1] - y

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = b[0]
      y = b[1]
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }

  dx = px - x
  dy = py - y
  return dx * dx + dy * dy
}

function pointToPolygonDist(x: number, y: number, polygon: Polygon) {
  let inside = false
  let minDistSq = Infinity

  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]
      const b = ring[j]

      const intersects =
        (a[1] > y) !== (b[1] > y) &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      if (intersects) inside = !inside

      const distSq = getSegDistSq(x, y, a, b)
      if (distSq < minDistSq) minDistSq = distSq
    }
  }

  const dist = Math.sqrt(minDistSq)
  return inside ? dist : -dist
}

function getBoundingBox(ring: Ring) {
  let minX = ring[0][0]
  let minY = ring[0][1]
  let maxX = ring[0][0]
  let maxY = ring[0][1]

  for (const point of ring) {
    if (point[0] < minX) minX = point[0]
    if (point[1] < minY) minY = point[1]
    if (point[0] > maxX) maxX = point[0]
    if (point[1] > maxY) maxY = point[1]
  }

  return { minX, minY, maxX, maxY }
}

function getCentroid(ring: Ring): Position {
  let area = 0
  let x = 0
  let y = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    const f = a[0] * b[1] - b[0] * a[1]
    area += f
    x += (a[0] + b[0]) * f
    y += (a[1] + b[1]) * f
  }
  if (area === 0) {
    return ring[0]
  }
  area *= 0.5
  return [x / (6 * area), y / (6 * area)]
}

class Cell {
  x: number
  y: number
  h: number
  d: number
  max: number

  constructor(x: number, y: number, h: number, polygon: Polygon) {
    this.x = x
    this.y = y
    this.h = h
    this.d = pointToPolygonDist(x, y, polygon)
    this.max = this.d + this.h * SQRT2
  }
}

class PriorityQueue {
  items: Cell[] = []

  push(cell: Cell) {
    this.items.push(cell)
    this.bubbleUp(this.items.length - 1)
  }

  pop() {
    const top = this.items[0]
    const bottom = this.items.pop()
    if (!top || !bottom) return null
    if (this.items.length > 0) {
      this.items[0] = bottom
      this.bubbleDown(0)
    }
    return top
  }

  bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.items[parent].max >= this.items[index].max) break
      ;[this.items[parent], this.items[index]] = [
        this.items[index],
        this.items[parent],
      ]
      index = parent
    }
  }

  bubbleDown(index: number) {
    const length = this.items.length
    while (true) {
      let left = index * 2 + 1
      let right = left + 1
      let largest = index

      if (left < length && this.items[left].max > this.items[largest].max) {
        largest = left
      }
      if (right < length && this.items[right].max > this.items[largest].max) {
        largest = right
      }
      if (largest === index) break
      ;[this.items[index], this.items[largest]] = [
        this.items[largest],
        this.items[index],
      ]
      index = largest
    }
  }

  get size() {
    return this.items.length
  }
}

function polylabel(polygon: Polygon, precision = PRECISION) {
  const { minX, minY, maxX, maxY } = getBoundingBox(polygon[0])
  let width = maxX - minX
  let height = maxY - minY

  if (width === 0 && height === 0) {
    return { point: [minX, minY] as Position, distance: 0 }
  }

  let cellSize = Math.min(width, height)
  let h = cellSize / 2
  const queue = new PriorityQueue()

  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(new Cell(x + h, y + h, h, polygon))
    }
  }

  const centroid = getCentroid(polygon[0])
  let bestCell = new Cell(centroid[0], centroid[1], 0, polygon)

  const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon)
  if (bboxCell.d > bestCell.d) bestCell = bboxCell

  while (queue.size > 0) {
    const cell = queue.pop()
    if (!cell) break
    if (cell.d > bestCell.d) bestCell = cell
    if (cell.max - bestCell.d <= precision) continue

    h = cell.h / 2
    queue.push(new Cell(cell.x - h, cell.y - h, h, polygon))
    queue.push(new Cell(cell.x + h, cell.y - h, h, polygon))
    queue.push(new Cell(cell.x - h, cell.y + h, h, polygon))
    queue.push(new Cell(cell.x + h, cell.y + h, h, polygon))
  }

  return { point: [bestCell.x, bestCell.y] as Position, distance: bestCell.d }
}

function labelForGeometry(geometry: Feature['geometry']) {
  if (geometry.type === 'Polygon') {
    return polylabel(geometry.coordinates as Polygon)
  }
  const multi = geometry.coordinates as MultiPolygon
  let best = { point: multi[0][0][0] as Position, distance: -Infinity }
  for (const polygon of multi) {
    const candidate = polylabel(polygon)
    if (candidate.distance > best.distance) {
      best = candidate
    }
  }
  return best
}

function main() {
  const raw = fs.readFileSync(INPUT_PATH, 'utf8')
  const data = JSON.parse(raw) as FeatureCollection

  const features = data.features.map((feature, index) => {
    const properties = feature.properties ?? {}
    const id =
      (properties['nta2020'] as string) ??
      (properties[':id'] as string) ??
      `${index}`
    const name =
      (properties['ntaname'] as string) ??
      (properties['cdtaname'] as string) ??
      (properties['boroname'] as string) ??
      `Neighborhood ${index + 1}`
    const borough = properties['boroname'] as string | undefined

    const { point } = labelForGeometry(feature.geometry)
    const labelProps: Record<string, unknown> = {
      id,
      name,
      source: 'nyc-nta-2020',
    }
    if (borough) labelProps.borough = borough

    return {
      type: 'Feature' as const,
      properties: labelProps,
      geometry: {
        type: 'Point' as const,
        coordinates: point,
      },
    }
  })

  const out: PointFeatureCollection = {
    type: 'FeatureCollection',
    features,
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2))
  console.log(`Wrote ${features.length} labels to ${OUTPUT_PATH}`)
}

main()
