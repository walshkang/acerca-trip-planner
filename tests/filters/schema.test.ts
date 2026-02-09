import { describe, expect, it } from 'vitest'
import {
  emptyCanonicalServerFilters,
  parseServerFilterPayload,
} from '@/lib/filters/schema'

function expectParsedOk(input: unknown) {
  const parsed = parseServerFilterPayload(input)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error('Expected parseServerFilterPayload to return ok=true')
  }
  return parsed
}

describe('parseServerFilterPayload', () => {
  it('returns empty canonical filters when payload is null', () => {
    const parsed = expectParsedOk(null)
    expect(parsed.hasAny).toBe(false)
    expect(parsed.canonical).toEqual(emptyCanonicalServerFilters())
  })

  it('normalizes category, energy, tags, open_now, and within_list_id', () => {
    const parsed = expectParsedOk({
      category: ['food', 'Bars'],
      energy: ['high', 'med'],
      tags: ['Date Night', 'brunch'],
      open_now: 'true',
      within_list_id: '550e8400-e29b-41d4-a716-446655440000',
    })

    expect(parsed.canonical).toEqual({
      category: ['Food', 'Drinks'],
      energy: ['Medium', 'High'],
      tags: ['brunch', 'date-night'],
      open_now: true,
      within_list_id: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('rejects unknown keys', () => {
    const parsed = parseServerFilterPayload({
      category: ['food'],
      not_allowed: true,
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_filter_payload')
    expect(parsed.fieldErrors.payload).toEqual([
      'Unknown filter field: not_allowed',
    ])
  })

  it('rejects tags without within_list_id', () => {
    const parsed = parseServerFilterPayload({
      tags: ['brunch'],
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.tags).toEqual([
      'tags filter requires within_list_id',
    ])
  })

  it('rejects invalid energy alias', () => {
    const parsed = parseServerFilterPayload({
      energy: ['turbo'],
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.energy).toEqual([
      'Unknown energy alias: turbo',
    ])
  })

  it('rejects invalid within_list_id values', () => {
    const parsed = parseServerFilterPayload({
      within_list_id: 'list-123',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.within_list_id).toEqual([
      'Invalid within_list_id: list-123',
    ])
  })
})
