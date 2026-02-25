import { describe, expect, it } from 'vitest'

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
  it('keeps mapbox styles unchanged for light and dark', () => {
    expect(resolveMapStyle({ provider: 'mapbox', tone: 'light' })).toEqual({
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      styleSource: 'mapbox',
      styleKey: 'mapbox:light:mapbox',
      transitBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
    })

    expect(resolveMapStyle({ provider: 'mapbox', tone: 'dark' })).toEqual({
      mapStyle: 'mapbox://styles/mapbox/navigation-night-v1',
      styleSource: 'mapbox',
      styleKey: 'mapbox:dark:mapbox',
      transitBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'settlement-subdivision-label',
        'settlement-major-label',
        'airport-label',
        'road-label',
      ],
    })
  })

  it('returns carto maplibre styles by default and for invalid style-source', () => {
    expect(resolveMapStyle({ provider: 'maplibre', tone: 'light' })).toEqual({
      mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      styleSource: 'carto',
      styleKey: 'maplibre:light:carto',
      transitBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
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
      styleKey: 'maplibre:dark:carto',
      transitBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
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
      styleKey: 'maplibre:light:pmtiles',
      transitBeforeId: 'pmtiles-place-labels',
      neighborhoodBeforeId: 'pmtiles-place-labels',
      transitBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
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
      styleKey: 'maplibre:dark:pmtiles',
      transitBeforeId: 'pmtiles-place-labels',
      neighborhoodBeforeId: 'pmtiles-place-labels',
      transitBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
      neighborhoodBeforeIdCandidates: [
        'pmtiles-place-labels',
        'place_label_city',
        'place_label_town',
        'place_label_village',
        'place_label_other',
        'place-label',
      ],
    })
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

  it('falls back to first symbol label layer when no candidate matches', () => {
    expect(
      resolveOverlayBeforeId({
        layers,
        candidates: ['missing-id'],
      })
    ).toBe('city-labels')
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
