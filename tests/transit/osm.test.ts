import { beforeEach, expect, it, vi } from 'vitest'

import { fetchOsmTransit } from '@/lib/transit/osm'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

it('returns null when overpass returns empty elements', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).toBeNull()
})

it('normalizes a subway relation to canonical schema', async () => {
  const mockRelation = {
    type: 'relation',
    id: 1,
    tags: { route: 'subway', name: 'Tsuen Wan Line', colour: '#CC0000' },
    members: [
      {
        type: 'way',
        ref: 100,
        role: '',
        geometry: [
          { lat: 22.3, lon: 114.1 },
          { lat: 22.31, lon: 114.11 },
        ],
      },
    ],
  }
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [mockRelation] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).not.toBeNull()
  expect(result!.features[0].properties.canonical_mode).toBe('subway')
  expect(result!.features[0].properties.route_color).toBe('CC0000')
  expect(result!.features[0].geometry.type).toBe('MultiLineString')
})

it('excludes relations with no way geometry', async () => {
  const mockRelation = {
    type: 'relation',
    id: 2,
    tags: { route: 'subway', name: 'No Geometry Line' },
    members: [{ type: 'node', ref: 200, role: 'stop' }],
  }
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ elements: [mockRelation] }), { status: 200 })
  )
  const result = await fetchOsmTransit(22.3, 114.1)
  expect(result).toBeNull()
})
