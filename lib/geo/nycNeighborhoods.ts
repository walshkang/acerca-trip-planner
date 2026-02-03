import fs from 'node:fs'
import path from 'node:path'

type Position = [number, number]
type Ring = Position[]
type Polygon = Ring[]
type MultiPolygon = Polygon[]

type NeighborhoodFeature = {
  name: string
  borough?: string
  polygons: Polygon[]
  bboxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }>
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties?: Record<string, unknown> | null
    geometry: {
      type: 'Polygon' | 'MultiPolygon'
      coordinates: Polygon | MultiPolygon
    }
  }>
}

const DATA_PATH = path.join(
  process.cwd(),
  'public',
  'map',
  'overlays',
  'nyc_neighborhood_boundaries.geojson'
)

let cached: NeighborhoodFeature[] | null = null

function bboxFromRing(ring: Ring) {
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

function pointInRing(x: number, y: number, ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]

    const intersect =
      (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygon(x: number, y: number, polygon: Polygon) {
  if (!polygon.length) return false
  if (!pointInRing(x, y, polygon[0])) return false
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(x, y, polygon[i])) return false
  }
  return true
}

function loadNeighborhoods(): NeighborhoodFeature[] {
  if (cached) return cached
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  const data = JSON.parse(raw) as FeatureCollection

  cached = data.features
    .map((feature) => {
      const props = feature.properties ?? {}
      const name =
        (props['ntaname'] as string) ??
        (props['cdtaname'] as string) ??
        (props['boroname'] as string) ??
        'Unknown'
      const borough = props['boroname'] as string | undefined
      const coordinates = feature.geometry.coordinates
      const polygons =
        feature.geometry.type === 'Polygon'
          ? ([coordinates] as Polygon[])
          : (coordinates as MultiPolygon)

      const bboxes = polygons.map((polygon) => bboxFromRing(polygon[0]))

      return {
        name,
        borough,
        polygons,
        bboxes,
      }
    })
    .filter((feature) => feature.polygons.length > 0)

  return cached
}

export function lookupNeighborhood(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const x = lng
  const y = lat
  const neighborhoods = loadNeighborhoods()

  for (const neighborhood of neighborhoods) {
    for (let i = 0; i < neighborhood.polygons.length; i += 1) {
      const bbox = neighborhood.bboxes[i]
      if (
        x < bbox.minX ||
        x > bbox.maxX ||
        y < bbox.minY ||
        y > bbox.maxY
      ) {
        continue
      }
      if (pointInPolygon(x, y, neighborhood.polygons[i])) {
        return { name: neighborhood.name, borough: neighborhood.borough }
      }
    }
  }

  return null
}
