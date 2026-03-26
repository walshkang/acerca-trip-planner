import { normalizeTag, normalizeTagList } from '@/lib/lists/tags'

/** Type-like tags we do not copy onto list items (place category lives on `places.category`). */
const TYPE_TAG_BLOCKLIST = new Set([
  'food',
  'coffee',
  'drinks',
  'drink',
  'bar',
  'bars',
  'sights',
  'sight',
  'shop',
  'shopping',
  'activity',
  'activities',
])

/**
 * Tags from enrichment `normalized_data` that we merge onto new list items,
 * matching `POST /api/lists/[id]/items` and promote tag upsert.
 */
export function listItemSeedTagsFromNormalizedData(
  raw: { tags?: unknown; category?: unknown } | null | undefined
): string[] {
  if (!raw) return []
  const normalizedFromEnrichment = normalizeTagList(raw.tags)
  if (!normalizedFromEnrichment?.length) return []
  const normalizedCategory =
    typeof raw.category === 'string' ? normalizeTag(raw.category) : null
  return normalizedFromEnrichment.filter((tag) => {
    if (TYPE_TAG_BLOCKLIST.has(tag)) return false
    if (normalizedCategory && tag === normalizedCategory) return false
    return true
  })
}
