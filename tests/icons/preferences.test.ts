import { describe, expect, it } from 'vitest'
import {
  CATEGORY_EMOJI_MAP,
  CATEGORY_ICON_CHOICES,
  DEFAULT_ICON_SCOPE,
  normalizeCategoryIconOverrides,
  parseCategoryIconOverrides,
  parseScopedCategoryIconOverrides,
  resolveCategoryEmoji,
  serializeScopedCategoryIconOverrides,
} from '@/lib/icons/preferences'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'

describe('category icon preferences', () => {
  it('normalizes overrides, keeps free-form emoji, and drops invalid values', () => {
    const normalized = normalizeCategoryIconOverrides({
      Food: '🍕',
      Coffee: '☕',
      Sights: '💥',
      Shop: 'not-emoji',
      Unknown: '🍸',
    })

    expect(normalized).toEqual({
      Food: '🍕',
      Sights: '💥',
    })
  })

  it('parses stored JSON safely', () => {
    expect(parseCategoryIconOverrides('not-json')).toEqual({})
    expect(parseCategoryIconOverrides(null)).toEqual({})
  })

  it('parses scoped overrides and supports legacy payload shape', () => {
    expect(
      parseScopedCategoryIconOverrides(
        JSON.stringify({
          listA: { Food: '🍕' },
          listB: { Coffee: '🧋' },
        })
      )
    ).toEqual({
      listA: { Food: '🍕' },
      listB: { Coffee: '🧋' },
    })

    expect(
      parseScopedCategoryIconOverrides(
        JSON.stringify({
          Food: '🍕',
          Coffee: '☕️',
        })
      )
    ).toEqual({
      [DEFAULT_ICON_SCOPE]: { Food: '🍕' },
    })
  })

  it('resolves override with default fallback', () => {
    expect(resolveCategoryEmoji('Food', { Food: '🍜' })).toBe('🍜')
    expect(resolveCategoryEmoji('Food', { Food: '💥' })).toBe('💥')
    expect(resolveCategoryEmoji('Coffee', {})).toBe('☕️')
  })

  it('keeps category choices exhaustive and includes defaults', () => {
    for (const category of CATEGORY_ENUM_VALUES) {
      expect(CATEGORY_ICON_CHOICES[category].length).toBeGreaterThan(0)
      expect(CATEGORY_ICON_CHOICES[category]).toContain(
        CATEGORY_EMOJI_MAP[category]
      )
    }
  })

  it('serializes scoped overrides after normalization', () => {
    const serialized = serializeScopedCategoryIconOverrides({
      listA: { Food: '🍕', Coffee: '☕️' },
      listB: { Activity: '🛶' },
      empty: {},
    })

    expect(JSON.parse(serialized)).toEqual({
      listA: { Food: '🍕' },
      listB: { Activity: '🛶' },
    })
  })
})
