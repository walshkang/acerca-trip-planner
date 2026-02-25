export type MapProvider = 'mapbox' | 'maplibre'
export type MapTone = 'light' | 'dark'
export type MaplibreStyleSource = 'carto' | 'pmtiles'
export type ResolvedStyleSource = 'mapbox' | MaplibreStyleSource

export type ResolveMapStyleInput = {
  provider: MapProvider
  tone: MapTone
  maplibreStyleSource?: string | null
}

export type ResolveMapStyleResult = {
  mapStyle: string
  styleSource: ResolvedStyleSource
  styleKey: string
  transitBeforeId?: string
  neighborhoodBeforeId?: string
  transitBeforeIdCandidates: string[]
  neighborhoodBeforeIdCandidates: string[]
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

  for (const candidate of candidates) {
    if (layers.some((layer) => hasLayerId(layer, candidate))) {
      return candidate
    }
  }

  const firstLabelSymbol = layers.find(isLabelSymbolLayer)
  if (firstLabelSymbol) return firstLabelSymbol.id

  const firstSymbolLayer = layers.find((layer) => layer.type === 'symbol')
  return firstSymbolLayer?.id
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
    text.includes('cannot parse style')
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

export function resolveMapStyle({
  provider,
  tone,
  maplibreStyleSource,
}: ResolveMapStyleInput): ResolveMapStyleResult {
  if (provider === 'mapbox') {
    const mapStyle =
      tone === 'dark'
        ? 'mapbox://styles/mapbox/navigation-night-v1'
        : 'mapbox://styles/mapbox/light-v11'

    return {
      mapStyle,
      styleSource: 'mapbox',
      styleKey: `mapbox:${tone}:mapbox`,
      transitBeforeIdCandidates: MAPBOX_LABEL_CANDIDATES,
      neighborhoodBeforeIdCandidates: MAPBOX_LABEL_CANDIDATES,
    }
  }

  const source = normalizeMaplibreStyleSource(maplibreStyleSource)
  if (source === 'pmtiles') {
    const mapStyle =
      tone === 'dark'
        ? '/map/style.maplibre.pmtiles.dark.json'
        : '/map/style.maplibre.pmtiles.light.json'

    return {
      mapStyle,
      styleSource: source,
      styleKey: `maplibre:${tone}:${source}`,
      transitBeforeId: PMTILES_LABELS_ANCHOR_ID,
      neighborhoodBeforeId: PMTILES_LABELS_ANCHOR_ID,
      transitBeforeIdCandidates: PMTILES_LABEL_CANDIDATES,
      neighborhoodBeforeIdCandidates: PMTILES_LABEL_CANDIDATES,
    }
  }

  const mapStyle =
    tone === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  return {
    mapStyle,
    styleSource: source,
    styleKey: `maplibre:${tone}:${source}`,
    transitBeforeIdCandidates: CARTO_LABEL_CANDIDATES,
    neighborhoodBeforeIdCandidates: CARTO_LABEL_CANDIDATES,
  }
}
