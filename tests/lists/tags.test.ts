import { describe, expect, it } from 'vitest'
import {
  distinctTagsFromItems,
  normalizeTag,
  normalizeTagList,
} from '@/lib/lists/tags'

describe('list tag normalization', () => {
  it('normalizes a single tag to kebab-case', () => {
    expect(normalizeTag('  Date Night  ')).toBe('date-night')
    expect(normalizeTag('Work__Friendly')).toBe('work-friendly')
    expect(normalizeTag('a---b')).toBe('a-b')
  })

  it('drops empty or invalid tags', () => {
    expect(normalizeTag('   ')).toBeNull()
    expect(normalizeTag('---')).toBeNull()
  })

  it('enforces max length', () => {
    const longTag = 'a'.repeat(40)
    const normalized = normalizeTag(longTag)
    expect(normalized?.length).toBe(32)
  })

  it('normalizes tag lists from strings', () => {
    const tags = normalizeTagList('Date Night, date-night, , Work Friendly')
    expect(tags).toEqual(['date-night', 'work-friendly'])
  })

  it('normalizes tag lists from arrays and dedupes', () => {
    const tags = normalizeTagList([' Coffee ', 'coffee', 'COFFEE'])
    expect(tags).toEqual(['coffee'])
  })

  it('returns null on invalid input', () => {
    expect(normalizeTagList(123)).toBeNull()
  })
})

describe('distinctTagsFromItems', () => {
  it('collects, normalizes, and sorts tags', () => {
    const tags = distinctTagsFromItems([
      { tags: ['date-night', 'Work Friendly'] },
      { tags: ['work-friendly', 'brunch'] },
      { tags: null },
    ])
    expect(tags).toEqual(['brunch', 'date-night', 'work-friendly'])
  })
})
