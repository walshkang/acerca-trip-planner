import { describe, expect, it } from 'vitest'

import {
  normalizeMaplibreStyleSource,
  resolveMapStyle,
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
    })

    expect(resolveMapStyle({ provider: 'mapbox', tone: 'dark' })).toEqual({
      mapStyle: 'mapbox://styles/mapbox/navigation-night-v1',
      styleSource: 'mapbox',
      styleKey: 'mapbox:dark:mapbox',
    })
  })

  it('returns carto maplibre styles by default and for invalid style-source', () => {
    expect(resolveMapStyle({ provider: 'maplibre', tone: 'light' })).toEqual({
      mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      styleSource: 'carto',
      styleKey: 'maplibre:light:carto',
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
    })
  })
})
