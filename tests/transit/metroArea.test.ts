import { describe, expect, it } from 'vitest'

import { citySlugForGrid, gridKey, normalizeMode } from '@/lib/transit/metroArea'

describe('normalizeMode', () => {
  it.each([
    [0, 'tram'],
    [1, 'subway'],
    [2, 'rail'],
    [3, 'bus'],
    [4, 'ferry'],
    [5, 'tram'],
    [6, 'other'],
    [7, 'tram'],
    [8, 'bus'],
    [11, 'bus'],
    [12, 'tram'],
  ] as const)('maps standard GTFS type %i to %s', (routeType, expected) => {
    expect(normalizeMode(routeType)).toBe(expected)
  })

  it.each([
    [100, 'rail'],
    [150, 'rail'],
    [400, 'subway'],
    [700, 'bus'],
    [950, 'tram'],
    [1050, 'ferry'],
    [1250, 'bus'],
    [1350, 'other'],
    [1450, 'tram'],
  ] as const)('maps extended type %i to %s', (routeType, expected) => {
    expect(normalizeMode(routeType)).toBe(expected)
  })

  it('maps unknown standard codes to other', () => {
    expect(normalizeMode(9)).toBe('other')
    expect(normalizeMode(10)).toBe('other')
    expect(normalizeMode(99)).toBe('other')
  })

  it('maps non-finite values to other', () => {
    expect(normalizeMode(Number.NaN)).toBe('other')
    expect(normalizeMode(Number.POSITIVE_INFINITY)).toBe('other')
  })
})

describe('citySlugForGrid', () => {
  it('resolves HK grid key to hong-kong', () => {
    expect(citySlugForGrid(gridKey(22.3, 114.1))).toBe('hong-kong')
  })

  it('returns null for unknown grid key', () => {
    expect(citySlugForGrid(gridKey(35.6, 139.7))).toBeNull() // Tokyo — no override
  })
})
