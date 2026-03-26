import type { MapLayer } from '@/lib/state/useMapLayerStore'
import type { TransitTileConfig } from '@/components/map/MapView.types'

export type MapProvider = 'mapbox' | 'maplibre'
export type MapTone = 'light' | 'dark'
export type MaplibreStyleSource = 'carto' | 'pmtiles'
export type ResolvedStyleSource = 'mapbox' | MaplibreStyleSource

export type { MapLayer }

export type ResolveMapStyleInput = {
  provider: MapProvider
  tone: MapTone
  maplibreStyleSource?: string | null
  layer?: MapLayer
}

export type ResolveMapStyleResult = {
  mapStyle: string
  styleSource: ResolvedStyleSource
  styleKey: string
  transitBeforeId?: string
  transitBeforeIdCandidates: string[]
  transitTileConfig: TransitTileConfig
}

const PMTILES_LABELS_ANCHOR_ID = 'pmtiles-place-labels'
const MAPBOX_LABEL_CANDIDATES = [
  'settlement-subdivision-label',
  'settlement-major-label',
  'airport-label',
  'road-label',
]
const CARTO_LABEL_CANDIDATES = [
  'place_label_city',
  'place_label_town',
  'place_label_village',
  'place_label_other',
  'place-label',
]
const PMTILES_LABEL_CANDIDATES = [
  PMTILES_LABELS_ANCHOR_ID,
  ...CARTO_LABEL_CANDIDATES,
]

const CARTO_VOYAGER_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

// ── Transit tile configs per provider ──

const MAPBOX_TRANSIT: TransitTileConfig = {
  vectorSource: 'composite',
  lineSourceLayer: 'road',
  lineFilter: ['in', 'class', 'major_rail', 'minor_rail', 'service_rail'],
  stopSourceLayer: 'transit_stop_label',
  stopFilter: [
    'in',
    'mode',
    'rail',
    'metro_rail',
    'light_rail',
    'tram',
  ],
  colorField: 'type',
}

/** Carto GL basemaps (Positron, Dark Matter, Voyager) use source id `carto`, not `openmaptiles`. */
const CARTO_VECTOR_TRANSIT: TransitTileConfig = {
  vectorSource: 'carto',
  lineSourceLayer: 'transportation',
  lineFilter: ['in', 'class', 'rail', 'transit'],
  colorField: 'subclass',
}

const PMTILES_TRANSIT: TransitTileConfig = {
  vectorSource: 'protomaps',
  lineSourceLayer: 'roads',
  lineFilter: ['in', 'pmap:kind', 'rail', 'light_rail', 'subway'],
  colorField: 'pmap:kind',
}

let warnedPmtilesLayerUnavailable = false

function warnPmtilesLayerUnavailable() {
  if (typeof console === 'undefined' || warnedPmtilesLayerUnavailable) return
  warnedPmtilesLayerUnavailable = true
  console.warn(
    '[acerca] Terrain base layer is not available for PMTiles; using the default style.'
  )
}

export type StyleLayerLike = {
  id: string
  type?: string
  layout?: Record<string, unknown>
}

function hasLayerId(layer: StyleLayerLike, id: string) {
  return layer.id === id
}

function isLabelSymbolLayer(layer: StyleLayerLike) {
  if (layer.type !== 'symbol') return false
  if (!layer.layout) return false
  return Object.prototype.hasOwnProperty.call(layer.layout, 'text-field')
}

export function resolveOverlayBeforeId({
  layers,
  preferredId,
  candidates = [],
}: {
  layers: StyleLayerLike[]
  preferredId?: string
  candidates?: string[]
}): string | undefined {
  if (!layers.length) return preferredId

  if (preferredId && layers.some((layer) => hasLayerId(layer, preferredId))) {
    return preferredId
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i]
    if (layers.some((layer) => hasLayerId(layer, candidate))) {
      return candidate
    }
  }

  const labelSymbols = layers.filter(isLabelSymbolLayer)
  const lastLabelSymbol = labelSymbols[labelSymbols.length - 1]
  if (lastLabelSymbol) return lastLabelSymbol.id

  const symbolLayers = layers.filter((layer) => layer.type === 'symbol')
  const lastSymbolLayer = symbolLayers[symbolLayers.length - 1]
  return lastSymbolLayer?.id
}

function extractErrorTextFromObject(error: Record<string, unknown>): string {
  const candidateFields = ['message', 'reason', 'statusText', 'error', 'details']
  for (const field of candidateFields) {
    const value = error[field]
    if (typeof value === 'string' && value.trim()) return value
    if (value && typeof value === 'object') {
      const nested = extractErrorTextFromObject(value as Record<string, unknown>)
      if (nested) return nested
    }
  }

  try {
    return JSON.stringify(error)
  } catch {
    return ''
  }
}

export function extractMapErrorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return ''
  return extractErrorTextFromObject(error as Record<string, unknown>)
}

export function isLikelyPmtilesError(error: unknown): boolean {
  const text = extractMapErrorText(error).toLowerCase()
  if (!text) return false

  return (
    text.includes('pmtiles') ||
    text.includes('.pmtiles') ||
    text.includes('/map/nyc.pmtiles') ||
    text.includes('source-layer') ||
    text.includes('failed to load source') ||
    text.includes('failed to load style') ||
    text.includes('cannot parse style') ||
    (text.includes('pmtiles') && text.includes('failed')) ||
    (text.includes('pmtiles') && text.includes('err_'))
  )
}

export function shouldFallbackFromPmtiles({
  provider,
  currentStyleSource,
  hasFallbackApplied,
  error,
}: {
  provider: MapProvider
  currentStyleSource: ResolvedStyleSource
  hasFallbackApplied: boolean
  error: unknown
}): boolean {
  if (provider !== 'maplibre') return false
  if (currentStyleSource !== 'pmtiles') return false
  if (hasFallbackApplied) return false
  return isLikelyPmtilesError(error)
}

export function normalizeMaplibreStyleSource(
  value?: string | null
): MaplibreStyleSource {
  return value === 'pmtiles' ? 'pmtiles' : 'carto'
}

function effectiveLayer(layer?: MapLayer): MapLayer {
  return layer ?? 'default'
}

export function resolveMapStyle({
  provider,
  tone,
  maplibreStyleSource,
  layer: layerInput,
}: ResolveMapStyleInput): ResolveMapStyleResult {
  const layer = effectiveLayer(layerInput)
  const layerKey = layerInput ?? 'default'

  if (provider === 'mapbox') {
    let mapStyle: string
    if (layer === 'terrain') {
      mapStyle = 'mapbox://styles/mapbox/outdoors-v12'
    } else {
      mapStyle =
        tone === 'dark'
          ? 'mapbox://styles/mapbox/navigation-night-v1'
          : 'mapbox://styles/mapbox/light-v11'
    }

    return {
      mapStyle,
      styleSource: 'mapbox',
      styleKey: `mapbox:${tone}:mapbox:${layerKey}`,
      transitBeforeIdCandidates: MAPBOX_LABEL_CANDIDATES,
      transitTileConfig: MAPBOX_TRANSIT,
    }
  }

  const source = normalizeMaplibreStyleSource(maplibreStyleSource)
  if (source === 'pmtiles') {
    if (layer === 'terrain') {
      warnPmtilesLayerUnavailable()
    }

    const mapStyle =
      tone === 'dark'
        ? '/map/style.maplibre.pmtiles.dark.json'
        : '/map/style.maplibre.pmtiles.light.json'

    return {
      mapStyle,
      styleSource: source,
      styleKey: `maplibre:${tone}:${source}:${layerKey}`,
      transitBeforeId: PMTILES_LABELS_ANCHOR_ID,
      transitBeforeIdCandidates: PMTILES_LABEL_CANDIDATES,
      transitTileConfig: PMTILES_TRANSIT,
    }
  }

  let mapStyle: string
  if (layer === 'terrain') {
    mapStyle = CARTO_VOYAGER_STYLE_URL
  } else {
    mapStyle =
      tone === 'dark'
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  }

  return {
    mapStyle,
    styleSource: source,
    styleKey: `maplibre:${tone}:${source}:${layerKey}`,
    transitBeforeIdCandidates: CARTO_LABEL_CANDIDATES,
    transitTileConfig: CARTO_VECTOR_TRANSIT,
  }
}
