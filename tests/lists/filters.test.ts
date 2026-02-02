import { describe, expect, it } from 'vitest'
import type { CategoryEnum } from '@/lib/types/enums'
import { matchesListFilters } from '@/lib/lists/filters'

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
