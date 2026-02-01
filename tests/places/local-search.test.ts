import { describe, expect, it } from 'vitest'
import {
  normalizeLocalSearchQuery,
  rankLocalSearchMatch,
  resolveCategoryMatch,
} from '@/lib/places/local-search'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'

describe('local search helpers', () => {
  it('normalizes keyword input', () => {
    expect(normalizeLocalSearchQuery('  Date Night  ')).toBe('date-night')
    expect(normalizeLocalSearchQuery('Work__Friendly')).toBe('work-friendly')
    expect(normalizeLocalSearchQuery('---')).toBeNull()
  })

  it('resolves category matches with case and plural support', () => {
    const sample =
      CATEGORY_ENUM_VALUES.find(
        (value) => !value.toLowerCase().endsWith('s')
      ) ?? CATEGORY_ENUM_VALUES[0]
    const lower = sample.toLowerCase()
    expect(resolveCategoryMatch(lower)).toBe(sample)
    expect(resolveCategoryMatch(`${lower}s`)).toBe(sample)
    expect(resolveCategoryMatch('nope')).toBeNull()
  })

  it('ranks matches deterministically', () => {
    expect(
      rankLocalSearchMatch(
        'Cafe Luna',
        null,
        'Coffee',
        'Cafe Luna',
        null,
        null,
        null,
        null
      )
    ).toBe(0)
    expect(
      rankLocalSearchMatch(
        'Cafe Luna',
        null,
        'Coffee',
        'Cafe',
        null,
        null,
        null,
        null
      )
    ).toBe(1)
    expect(
      rankLocalSearchMatch(
        'Cafe Luna',
        null,
        'Coffee',
        'Luna',
        null,
        null,
        null,
        null
      )
    ).toBe(2)
    expect(
      rankLocalSearchMatch(
        'Cafe Luna',
        null,
        'Coffee',
        'Cafe_Luna',
        null,
        'cafe-luna',
        'cafe-luna',
        null
      )
    ).toBe(3)
    expect(
      rankLocalSearchMatch(
        'Alpha',
        null,
        'Coffee',
        'coffee',
        'Coffee',
        null,
        null,
        null
      )
    ).toBe(4)
    expect(
      rankLocalSearchMatch(
        'Alpha',
        '123 Main St',
        'Coffee',
        'Main',
        null,
        null,
        null,
        null
      )
    ).toBe(5)
    expect(
      rankLocalSearchMatch(
        'Alpha',
        '123 Main St',
        'Coffee',
        'Main_St',
        null,
        'main-st',
        null,
        'main-st'
      )
    ).toBe(6)
    expect(
      rankLocalSearchMatch(
        'Alpha',
        null,
        'Coffee',
        'zzz',
        null,
        null,
        null,
        null
      )
    ).toBe(7)
  })
})
