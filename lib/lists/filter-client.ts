import {
  isCategoryEnum,
  type CanonicalListFilters,
  type ListFilterFieldErrors,
} from '@/lib/lists/filters'
import type { PlannerSlot } from '@/lib/lists/planner'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'

const CATEGORY_RANK = new Map(
  CATEGORY_ENUM_VALUES.map((value, index) => [value, index])
)
const SLOT_VALUES: readonly PlannerSlot[] = ['morning', 'afternoon', 'evening']

function isPlannerSlot(value: unknown): value is PlannerSlot {
  return typeof value === 'string' && SLOT_VALUES.includes(value as PlannerSlot)
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export function emptyCanonicalFilters(): CanonicalListFilters {
  return {
    categories: [],
    tags: [],
    scheduled_date: null,
    slot: null,
  }
}

export function sortCategories(categories: CategoryEnum[]): CategoryEnum[] {
  return categories.slice().sort((a, b) => {
    const rankA = CATEGORY_RANK.get(a) ?? 999
    const rankB = CATEGORY_RANK.get(b) ?? 999
    return rankA - rankB
  })
}

export function sortTags(tags: string[]): string[] {
  return tags.slice().sort((a, b) => a.localeCompare(b))
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

export function normalizeCanonicalFilters(input: unknown): CanonicalListFilters {
  const source =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {}

  const categories = uniqueStrings(
    asStringList(source.categories ?? source.category)
  ).filter((value): value is CategoryEnum => isCategoryEnum(value))

  const tags = uniqueStrings(asStringList(source.tags))

  return {
    categories: sortCategories(categories),
    tags: sortTags(tags),
    scheduled_date:
      typeof source.scheduled_date === 'string' &&
      source.scheduled_date.trim().length
        ? source.scheduled_date
        : null,
    slot: isPlannerSlot(source.slot) ? source.slot : null,
  }
}

export function normalizeFilterFieldErrors(
  input: unknown
): ListFilterFieldErrors | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null
  }
  const source = input as Record<string, unknown>
  const next: ListFilterFieldErrors = {}

  const payloadMessages = [
    ...asStringList(source.payload),
    ...asStringList(source.energy),
    ...asStringList(source.open_now),
    ...asStringList(source.within_list_id),
  ]
  const categoryMessages = [
    ...asStringList(source.categories),
    ...asStringList(source.category),
  ]
  const tagMessages = asStringList(source.tags)
  const dateMessages = asStringList(source.scheduled_date)
  const slotMessages = asStringList(source.slot)

  if (payloadMessages.length) next.payload = payloadMessages
  if (categoryMessages.length) next.categories = categoryMessages
  if (tagMessages.length) next.tags = tagMessages
  if (dateMessages.length) next.scheduled_date = dateMessages
  if (slotMessages.length) next.slot = slotMessages

  return Object.keys(next).length ? next : null
}

export function buildServerFiltersFromDraft(filters: CanonicalListFilters): {
  category: CategoryEnum[]
  tags: string[]
} {
  return {
    category: filters.categories,
    tags: filters.tags,
  }
}

export function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function areFiltersEqual(
  a: CanonicalListFilters,
  b: CanonicalListFilters
): boolean {
  return (
    areStringArraysEqual(a.categories, b.categories) &&
    areStringArraysEqual(a.tags, b.tags) &&
    a.scheduled_date === b.scheduled_date &&
    a.slot === b.slot
  )
}
