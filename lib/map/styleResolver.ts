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
}

const PMTILES_LABELS_ANCHOR_ID = 'pmtiles-place-labels'

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
  }
}
