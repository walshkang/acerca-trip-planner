import { describe, expect, it } from 'vitest'
import type { CanonicalListFilters } from '@/lib/lists/filters'
import {
  areFiltersEqual,
  buildServerFiltersFromDraft,
  normalizeCanonicalFilters,
  normalizeFilterFieldErrors,
} from '@/lib/lists/filter-client'

describe('normalizeCanonicalFilters', () => {
  it('normalizes and sorts canonical category and tag arrays', () => {
    const normalized = normalizeCanonicalFilters({
      category: ['Coffee', 'Food', 'Coffee', 'invalid-category'],
      tags: ['beta', 'alpha', 'beta'],
      scheduled_date: '2026-02-09',
      slot: 'morning',
    })

    expect(normalized).toEqual({
      categories: ['Food', 'Coffee'],
      tags: ['alpha', 'beta'],
      scheduled_date: '2026-02-09',
      slot: 'morning',
    })
  })

  it('falls back to empty canonical filters for invalid shapes', () => {
    expect(normalizeCanonicalFilters(123)).toEqual({
      categories: [],
      tags: [],
      scheduled_date: null,
      slot: null,
    })
  })
})

describe('normalizeFilterFieldErrors', () => {
  it('maps server field errors into list filter fields', () => {
    const fieldErrors = normalizeFilterFieldErrors({
      category: ['bad category'],
      tags: ['bad tags'],
      energy: ['unsupported for this surface'],
      open_now: ['unsupported for this surface'],
      within_list_id: ['invalid list id'],
    })

    expect(fieldErrors).toEqual({
      categories: ['bad category'],
      tags: ['bad tags'],
      payload: [
        'unsupported for this surface',
        'unsupported for this surface',
        'invalid list id',
      ],
    })
  })

  it('returns null for invalid inputs', () => {
    expect(normalizeFilterFieldErrors(null)).toBeNull()
    expect(normalizeFilterFieldErrors(['x'])).toBeNull()
  })
})

describe('buildServerFiltersFromDraft', () => {
  it('keeps only category and tag filters for query requests', () => {
    expect(
      buildServerFiltersFromDraft({
        categories: ['Food'],
        tags: ['date-night'],
        scheduled_date: '2026-02-09',
        slot: 'evening',
      })
    ).toEqual({
      category: ['Food'],
      tags: ['date-night'],
    })
  })
})

describe('areFiltersEqual', () => {
  it('compares canonical filter objects', () => {
    const base: CanonicalListFilters = {
      categories: ['Food'],
      tags: ['date-night'],
      scheduled_date: null,
      slot: null,
    }

    expect(areFiltersEqual(base, base)).toBe(true)
    expect(
      areFiltersEqual(base, {
        ...base,
        tags: ['brunch'],
      })
    ).toBe(false)
  })
})
