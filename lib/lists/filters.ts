import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { CategoryEnum } from '@/lib/types/enums'

const CATEGORY_SET = new Set(CATEGORY_ENUM_VALUES)
const CATEGORY_ORDER = new Map(
  CATEGORY_ENUM_VALUES.map((value, index) => [value, index])
)

export function isCategoryEnum(value: unknown): value is CategoryEnum {
  return typeof value === 'string' && CATEGORY_SET.has(value as CategoryEnum)
}

export function distinctTypesFromItems(
  items: Array<{ place?: { category?: string | null } | null }>
): CategoryEnum[] {
  const seen = new Set<CategoryEnum>()

  for (const item of items) {
    const category = item.place?.category
    if (isCategoryEnum(category)) {
      seen.add(category)
    }
  }

  return Array.from(seen).sort((a, b) => {
    const orderA = CATEGORY_ORDER.get(a) ?? 999
    const orderB = CATEGORY_ORDER.get(b) ?? 999
    return orderA - orderB
  })
}

export function matchesListFilters(
  item: {
    place?: { category?: string | null } | null
    tags?: string[] | null
  },
  selectedTypes: CategoryEnum[],
  selectedTags: string[]
): boolean {
  if (selectedTypes.length) {
    const category = item.place?.category
    if (!isCategoryEnum(category) || !selectedTypes.includes(category)) {
      return false
    }
  }

  if (selectedTags.length) {
    const tags = item.tags ?? []
    if (!selectedTags.some((tag) => tags.includes(tag))) {
      return false
    }
  }

  return true
}
