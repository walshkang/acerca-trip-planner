import { describe, expect, it } from 'vitest'
import { listItemSeedTagsFromNormalizedData } from '@/lib/lists/list-item-seed-tags'

describe('listItemSeedTagsFromNormalizedData', () => {
  it('returns empty when missing or invalid', () => {
    expect(listItemSeedTagsFromNormalizedData(null)).toEqual([])
    expect(listItemSeedTagsFromNormalizedData(undefined)).toEqual([])
    expect(listItemSeedTagsFromNormalizedData({})).toEqual([])
  })

  it('filters type blocklist and duplicate category tag', () => {
    expect(
      listItemSeedTagsFromNormalizedData({
        tags: ['Food', 'romantic', 'coffee', 'date-night'],
        category: 'Food',
      })
    ).toEqual(['romantic', 'date-night'])
  })

  it('keeps tags when category is absent', () => {
    expect(
      listItemSeedTagsFromNormalizedData({
        tags: ['pasta', 'wine'],
      })
    ).toEqual(['pasta', 'wine'])
  })
})
