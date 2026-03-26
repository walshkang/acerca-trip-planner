import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isLikelyPmtilesError,
  normalizeMaplibreStyleSource,
  resolveOverlayBeforeId,
  resolveMapStyle,
  shouldFallbackFromPmtiles,
} from '@/lib/map/styleResolver'

describe('normalizeMaplibreStyleSource', () => {
  it('accepts pmtiles and defaults all other values to carto', () => {
    expect(normalizeMaplibreStyleSource('pmtiles')).toBe('pmtiles')
    expect(normalizeMaplibreStyleSource('carto')).toBe('carto')
    expect(normalizeMaplibreStyleSource('PMTILES')).toBe('carto')
    expect(normalizeMaplibreStyleSource(undefined)).toBe('carto')
    expect(normalizeMaplibreStyleSource(null)).toBe('carto')
  })
})

describe('resolveMapStyle', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps mapbox styles unchanged for light and dark', () => {
    expect(resolveMapStyle({ provider: 'mapbox', tone: 'light' })).toEqual({
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      styleSource: 'mapbox',
      styleKey: 'mapbox:light:mapbox:default',
      transitBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
      transitTileConfig: {
        vectorSource: 'composite',
        lineSourceLayer: 'road',
        lineFilter: ['in', 'class', 'major_rail', 'minor_rail', 'service_rail'],
        stopSourceLayer: 'transit_stop_label',
        stopFilter: ['in', 'mode', 'rail', 'metro_rail', 'light_rail', 'tram'],
        colorField: 'type',
      },
    })

    expect(resolveMapStyle({ provider: 'mapbox', tone: 'dark' })).toEqual({
      mapStyle: 'mapbox://styles/mapbox/navigation-night-v1',
      styleSource: 'mapbox',
      styleKey: 'mapbox:dark:mapbox:default',
      transitBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
      transitTileConfig: {
        vectorSource: 'composite',
        lineSourceLayer: 'road',
        lineFilter: ['in', 'class', 'major_rail', 'minor_rail', 'service_rail'],
        stopSourceLayer: 'transit_stop_label',
        stopFilter: ['in', 'mode', 'rail', 'metro_rail', 'light_rail', 'tram'],
        colorField: 'type',
      },
    })
  })

  it('returns carto maplibre styles by default and for invalid style-source', () => {
    expect(resolveMapStyle({ provider: 'maplibre', tone: 'light' })).toEqual({
      mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      styleSource: 'carto',
      styleKey: 'maplibre:light:carto:default',
      transitBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      transitTileConfig: {
        vectorSource: 'carto',
        lineSourceLayer: 'transportation',
        lineFilter: ['in', 'class', 'rail', 'transit'],
        colorField: 'subclass',
      },
    })

    expect(
      resolveMapStyle({
        provider: 'maplibre',
        tone: 'dark',
        maplibreStyleSource: 'invalid',
      })
    ).toEqual({
      mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      styleSource: 'carto',
      styleKey: 'maplibre:dark:carto:default',
      transitBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      transitTileConfig: {
        vectorSource: 'carto',
        lineSourceLayer: 'transportation',
        lineFilter: ['in', 'class', 'rail', 'transit'],
        colorField: 'subclass',
      },
    })
  })

  it('returns pmtiles styles and anchor contract when source is pmtiles', () => {
    expect(
      resolveMapStyle({
        provider: 'maplibre',
        tone: 'light',
        maplibreStyleSource: 'pmtiles',
      })
    ).toEqual({
      mapStyle: '/map/style.maplibre.pmtiles.light.json',
      styleSource: 'pmtiles',
      styleKey: 'maplibre:light:pmtiles:default',
      transitBeforeId: 'pmtiles-place-labels',
      transitBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      transitTileConfig: {
        vectorSource: 'protomaps',
        lineSourceLayer: 'roads',
        lineFilter: ['in', 'pmap:kind', 'rail', 'light_rail', 'subway'],
        colorField: 'pmap:kind',
      },
    })

    expect(
      resolveMapStyle({
        provider: 'maplibre',
        tone: 'dark',
        maplibreStyleSource: 'pmtiles',
      })
    ).toEqual({
      mapStyle: '/map/style.maplibre.pmtiles.dark.json',
      styleSource: 'pmtiles',
      styleKey: 'maplibre:dark:pmtiles:default',
      transitBeforeId: 'pmtiles-place-labels',
      transitBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      transitTileConfig: {
        vectorSource: 'protomaps',
        lineSourceLayer: 'roads',
        lineFilter: ['in', 'pmap:kind', 'rail', 'light_rail', 'subway'],
        colorField: 'pmap:kind',
      },
    })
  })

  it('uses mapbox terrain style', () => {
    const terrain = resolveMapStyle({
      provider: 'mapbox',
      tone: 'dark',
      layer: 'terrain',
    })
    expect(terrain.mapStyle).toBe('mapbox://styles/mapbox/outdoors-v12')
    expect(terrain.styleKey).toBe('mapbox:dark:mapbox:terrain')
  })

  it('transit layer uses default base style (overlays handle visuals)', () => {
    const transit = resolveMapStyle({
      provider: 'mapbox',
      tone: 'light',
      layer: 'transit',
    })
    expect(transit.mapStyle).toBe('mapbox://styles/mapbox/light-v11')
    expect(transit.styleKey).toBe('mapbox:light:mapbox:transit')

    const transitCarto = resolveMapStyle({
      provider: 'maplibre',
      tone: 'light',
      layer: 'transit',
    })
    expect(transitCarto.mapStyle).toBe(
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    )
    expect(transitCarto.styleKey).toBe('maplibre:light:carto:transit')
  })

  it('uses carto voyager for maplibre terrain', () => {
    const r = resolveMapStyle({
      provider: 'maplibre',
      tone: 'light',
      layer: 'terrain',
    })
    expect(r.mapStyle).toBe(
      'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
    )
    expect(r.styleKey).toBe('maplibre:light:carto:terrain')
  })

  it('keeps pmtiles URL for transit/terrain but uses distinct styleKey', () => {
    const base = resolveMapStyle({
      provider: 'maplibre',
      tone: 'light',
      maplibreStyleSource: 'pmtiles',
      layer: 'default',
    })
    const transit = resolveMapStyle({
      provider: 'maplibre',
      tone: 'light',
      maplibreStyleSource: 'pmtiles',
      layer: 'transit',
    })
    expect(transit.mapStyle).toBe(base.mapStyle)
    expect(transit.styleKey).toBe('maplibre:light:pmtiles:transit')
  })
})

describe('resolveOverlayBeforeId', () => {
  const layers = [
    { id: 'background', type: 'background' as const },
    { id: 'water', type: 'fill' as const },
    {
      id: 'city-labels',
      type: 'symbol' as const,
      layout: { 'text-field': ['get', 'name'] },
    },
    { id: 'poi', type: 'symbol' as const, layout: {} },
  ]

  it('prefers preferred id when present', () => {
    expect(
      resolveOverlayBeforeId({
        layers,
        preferredId: 'city-labels',
        candidates: ['poi'],
      })
    ).toBe('city-labels')
  })

  it('falls back to candidate ids when preferred id is missing', () => {
    expect(
      resolveOverlayBeforeId({
        layers,
        preferredId: 'missing-id',
        candidates: ['poi', 'other'],
      })
    ).toBe('poi')
  })

  it('falls back to the topmost text symbol layer when no candidate matches', () => {
    expect(
      resolveOverlayBeforeId({
        layers,
        candidates: ['missing-id'],
      })
    ).toBe('city-labels')
  })

  it('prefers the last matching candidate so overlays sit above mid-stack roads', () => {
    const stacked = [
      { id: 'road', type: 'line' as const },
      {
        id: 'settlement-subdivision-label',
        type: 'symbol' as const,
        layout: { 'text-field': ['get', 'name'] },
      },
      { id: 'bridge', type: 'line' as const },
      {
        id: 'road-label',
        type: 'symbol' as const,
        layout: { 'text-field': ['get', 'name'] },
      },
    ]
    expect(
      resolveOverlayBeforeId({
        layers: stacked,
        preferredId: 'missing',
        candidates: [
          'settlement-subdivision-label',
          'settlement-major-label',
          'road-label',
        ],
      })
    ).toBe('road-label')
  })

  it('uses the last text symbol in the style when there are several', () => {
    const stacked = [
      {
        id: 'early-place',
        type: 'symbol' as const,
        layout: { 'text-field': ['get', 'name'] },
      },
      { id: 'roads', type: 'line' as const },
      {
        id: 'late-place',
        type: 'symbol' as const,
        layout: { 'text-field': ['get', 'name'] },
      },
    ]
    expect(
      resolveOverlayBeforeId({
        layers: stacked,
        candidates: ['nope'],
      })
    ).toBe('late-place')
  })
})

describe('pmtiles fallback helpers', () => {
  it('detects likely pmtiles style/source failures', () => {
    expect(isLikelyPmtilesError('Failed to load source /map/nyc.pmtiles')).toBe(
      true
    )
    expect(isLikelyPmtilesError('layer source-layer not found')).toBe(true)
    expect(isLikelyPmtilesError('network timeout')).toBe(false)
  })

  it('only falls back once and only for maplibre pmtiles mode', () => {
    expect(
      shouldFallbackFromPmtiles({
        provider: 'maplibre',
        currentStyleSource: 'pmtiles',
        hasFallbackApplied: false,
        error: 'Failed to load source /map/nyc.pmtiles',
      })
    ).toBe(true)

    expect(
      shouldFallbackFromPmtiles({
        provider: 'maplibre',
        currentStyleSource: 'pmtiles',
        hasFallbackApplied: true,
        error: 'Failed to load source /map/nyc.pmtiles',
      })
    ).toBe(false)

    expect(
      shouldFallbackFromPmtiles({
        provider: 'maplibre',
        currentStyleSource: 'carto',
        hasFallbackApplied: false,
        error: 'Failed to load source /map/nyc.pmtiles',
      })
    ).toBe(false)
  })
})
