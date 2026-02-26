import { describe, expect, it } from 'vitest'
import { parseDiscoverySuggestRequest } from '@/lib/discovery/contract'

describe('parseDiscoverySuggestRequest', () => {
  it('rejects non-object payloads', () => {
    const parsed = parseDiscoverySuggestRequest('bad')
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_discovery_payload')
    expect(parsed.fieldErrors.payload).toEqual([
      'Discovery suggest payload must be a JSON object',
    ])
  })

  it('rejects unknown keys', () => {
    const parsed = parseDiscoverySuggestRequest({
      intent: 'coffee',
      unexpected: true,
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.payload).toEqual(['Unknown field: unexpected'])
  })

  it('rejects missing and empty intent', () => {
    const missing = parseDiscoverySuggestRequest({})
    expect(missing.ok).toBe(false)
    if (!missing.ok) {
      expect(missing.fieldErrors.intent).toEqual([
        'intent is required and must be a string',
      ])
    }

    const empty = parseDiscoverySuggestRequest({ intent: '   ' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) {
      expect(empty.fieldErrors.intent).toEqual(['intent must be a non-empty string'])
    }
  })

  it('rejects lat/lng partial bias', () => {
    const parsed = parseDiscoverySuggestRequest({
      intent: 'coffee',
      lat: 40.7,
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.payload).toEqual([
      'lat and lng must be provided together',
    ])
  })

  it('clamps radius and limit into bounds', () => {
    const parsed = parseDiscoverySuggestRequest({
      intent: 'coffee',
      lat: 40.71,
      lng: -73.99,
      radius_m: 999999,
      limit: 999,
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.canonical.limit).toBe(10)
    expect(parsed.canonical.bias).toEqual({
      lat: 40.71,
      lng: -73.99,
      radius_m: 100000,
    })
    expect(parsed.canonical.include_summary).toBe(false)
  })

  it('accepts valid list_id and include_summary', () => {
    const parsed = parseDiscoverySuggestRequest({
      intent: 'date night',
      list_id: '550e8400-e29b-41d4-a716-446655440000',
      include_summary: true,
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.canonical.list_id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(parsed.canonical.include_summary).toBe(true)
  })
})
