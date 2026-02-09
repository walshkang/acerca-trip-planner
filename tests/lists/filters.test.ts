import { describe, expect, it } from 'vitest'
import type { CategoryEnum } from '@/lib/types/enums'
import {
  matchesCanonicalListFilters,
  matchesListFilters,
  parseListFilterPayload,
} from '@/lib/lists/filters'

function expectParsedOk(input: unknown) {
  const parsed = parseListFilterPayload(input)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error('Expected parseListFilterPayload to return ok=true')
  }
  return parsed
}

describe('matchesListFilters', () => {
  const food = 'Food' as CategoryEnum
  const coffee = 'Coffee' as CategoryEnum

  const item = {
    place: { category: food },
    tags: ['date-night', 'brunch'],
  }

  it('returns true when no filters are selected', () => {
    expect(matchesListFilters(item, [], [])).toBe(true)
  })

  it('matches place types with OR semantics', () => {
    expect(matchesListFilters(item, [food, coffee], [])).toBe(true)
    expect(matchesListFilters(item, [coffee], [])).toBe(false)
  })

  it('matches tags with OR semantics', () => {
    expect(matchesListFilters(item, [], ['brunch', 'work'])).toBe(true)
    expect(matchesListFilters(item, [], ['work'])).toBe(false)
  })

  it('applies AND across type and tag groups', () => {
    expect(matchesListFilters(item, [food], ['brunch'])).toBe(true)
    expect(matchesListFilters(item, [food], ['work'])).toBe(false)
    expect(matchesListFilters(item, [coffee], ['brunch'])).toBe(false)
  })

  it('requires a category when types are selected', () => {
    const noCategory = { place: null, tags: ['brunch'] }
    expect(matchesListFilters(noCategory, [food], [])).toBe(false)
  })
})

describe('parseListFilterPayload', () => {
  it('returns empty canonical filters when payload is null', () => {
    const parsed = expectParsedOk(null)
    expect(parsed.hasAny).toBe(false)
    expect(parsed.canonical).toEqual({
      categories: [],
      tags: [],
      scheduled_date: null,
      slot: null,
    })
  })

  it('normalizes category aliases, tags, date, and slot', () => {
    const parsed = expectParsedOk({
      categories: ['food', 'bars', 'Coffee'],
      tags: ['Date Night', 'brunch'],
      date: '2026-02-07',
      slot: 'pm',
    })

    expect(parsed.hasAny).toBe(true)
    expect(parsed.canonical).toEqual({
      categories: ['Food', 'Coffee', 'Drinks'],
      tags: ['brunch', 'date-night'],
      scheduled_date: '2026-02-07',
      slot: 'afternoon',
    })
  })

  it('rejects malformed payload types', () => {
    const parsed = parseListFilterPayload(123)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_filter_payload')
    expect(parsed.fieldErrors.payload).toEqual([
      'Filter payload must be a JSON object',
    ])
  })

  it('rejects unknown category aliases', () => {
    const parsed = parseListFilterPayload({
      categories: ['food', 'unknown-category'],
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_filter_payload')
    expect(parsed.fieldErrors.categories).toEqual([
      'Unknown category alias: unknown-category',
    ])
  })

  it('returns field-level errors for invalid date and slot', () => {
    const parsed = parseListFilterPayload({
      scheduled_date: '2026-02-30',
      slot: 'dawn',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_filter_payload')
    expect(parsed.fieldErrors.scheduled_date).toEqual([
      'Invalid scheduled_date: 2026-02-30',
    ])
    expect(parsed.fieldErrors.slot).toEqual(['Invalid slot: dawn'])
  })
})

describe('matchesCanonicalListFilters', () => {
  it('matches across category, tags, date, and slot', () => {
    const parsed = expectParsedOk({
      categories: ['food'],
      tags: ['brunch'],
      scheduled_date: '2026-02-07',
      slot: 'morning',
    })

    const item = {
      place: { category: 'Food' as CategoryEnum },
      tags: ['Brunch', 'date-night'],
      scheduled_date: '2026-02-07',
      scheduled_start_time: '09:00:00',
    }

    expect(matchesCanonicalListFilters(item, parsed.canonical)).toBe(true)
  })

  it('fails when slot does not match', () => {
    const parsed = expectParsedOk({ slot: 'morning' })
    const item = {
      place: { category: 'Food' as CategoryEnum },
      tags: ['brunch'],
      scheduled_date: '2026-02-07',
      scheduled_start_time: '19:00:00',
    }

    expect(matchesCanonicalListFilters(item, parsed.canonical)).toBe(false)
  })
})
