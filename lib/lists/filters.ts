import { parseIsoDateOnly, slotFromScheduledStartTime } from '@/lib/lists/planner'
import { normalizeTagList, normalizeTag } from '@/lib/lists/tags'
import type { PlannerSlot } from '@/lib/lists/planner'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { CategoryEnum } from '@/lib/types/enums'

const CATEGORY_SET = new Set(CATEGORY_ENUM_VALUES)
const CATEGORY_ORDER = new Map(
  CATEGORY_ENUM_VALUES.map((value, index) => [value, index])
)
const CATEGORY_ALIAS_MAP: Record<string, CategoryEnum> = {
  food: 'Food',
  foods: 'Food',
  restaurant: 'Food',
  restaurants: 'Food',
  dining: 'Food',
  coffee: 'Coffee',
  cafe: 'Coffee',
  cafes: 'Coffee',
  sights: 'Sights',
  sight: 'Sights',
  attraction: 'Sights',
  attractions: 'Sights',
  landmark: 'Sights',
  landmarks: 'Sights',
  shop: 'Shop',
  shops: 'Shop',
  shopping: 'Shop',
  store: 'Shop',
  stores: 'Shop',
  market: 'Shop',
  markets: 'Shop',
  activity: 'Activity',
  activities: 'Activity',
  experience: 'Activity',
  experiences: 'Activity',
  drinks: 'Drinks',
  drink: 'Drinks',
  bar: 'Drinks',
  bars: 'Drinks',
  pub: 'Drinks',
  pubs: 'Drinks',
  nightclub: 'Drinks',
  nightclubs: 'Drinks',
  winebar: 'Drinks',
  winebars: 'Drinks',
  cocktail: 'Drinks',
  cocktails: 'Drinks',
}
const SLOT_ALIAS_MAP: Record<string, PlannerSlot> = {
  morning: 'morning',
  am: 'morning',
  afternoon: 'afternoon',
  noon: 'afternoon',
  pm: 'afternoon',
  evening: 'evening',
  night: 'evening',
  tonite: 'evening',
  tonight: 'evening',
}

export type CanonicalListFilters = {
  categories: CategoryEnum[]
  tags: string[]
  scheduled_date: string | null
  slot: PlannerSlot | null
}

export type ListFilterField =
  | 'payload'
  | 'categories'
  | 'tags'
  | 'scheduled_date'
  | 'slot'

export type ListFilterFieldErrors = Partial<Record<ListFilterField, string[]>>

export type ParseListFilterPayloadResult =
  | {
      ok: true
      canonical: CanonicalListFilters
      hasAny: boolean
    }
  | {
      ok: false
      code: 'invalid_filter_payload'
      message: string
      fieldErrors: ListFilterFieldErrors
    }

type FilterPayloadInput = {
  categories?: unknown
  types?: unknown
  category?: unknown
  type?: unknown
  tags?: unknown
  date?: unknown
  scheduled_date?: unknown
  slot?: unknown
}

function normalizeAliasKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function appendFieldError(
  fieldErrors: ListFilterFieldErrors,
  field: ListFilterField,
  message: string
) {
  const existing = fieldErrors[field] ?? []
  fieldErrors[field] = [...existing, message]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function splitCsv(input: string): string[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function parseStringList(
  rawValue: unknown,
  field: ListFilterField,
  fieldErrors: ListFilterFieldErrors
): string[] | null {
  if (rawValue == null) return []
  if (typeof rawValue === 'string') return splitCsv(rawValue)
  if (Array.isArray(rawValue)) {
    const values: string[] = []
    for (const raw of rawValue) {
      if (typeof raw !== 'string') {
        appendFieldError(fieldErrors, field, `${field} must contain only strings`)
        return null
      }
      values.push(...splitCsv(raw))
    }
    return values
  }
  appendFieldError(
    fieldErrors,
    field,
    `${field} must be provided as a string or string[]`
  )
  return null
}

function sortCategories(values: CategoryEnum[]): CategoryEnum[] {
  return values.slice().sort((a, b) => {
    const orderA = CATEGORY_ORDER.get(a) ?? 999
    const orderB = CATEGORY_ORDER.get(b) ?? 999
    return orderA - orderB
  })
}

function normalizeCategoryList(
  rawValue: unknown,
  fieldErrors: ListFilterFieldErrors
): CategoryEnum[] {
  const raw = parseStringList(rawValue, 'categories', fieldErrors)
  if (!raw) return []
  const seen = new Set<CategoryEnum>()
  const normalized: CategoryEnum[] = []
  for (const value of raw) {
    const category = normalizeCategoryAlias(value)
    if (!category) {
      appendFieldError(fieldErrors, 'categories', `Unknown category alias: ${value}`)
      continue
    }
    if (seen.has(category)) continue
    seen.add(category)
    normalized.push(category)
  }
  return sortCategories(normalized)
}

function normalizeTagListStrict(
  rawValue: unknown,
  fieldErrors: ListFilterFieldErrors
): string[] {
  const raw = parseStringList(rawValue, 'tags', fieldErrors)
  if (!raw) return []
  const normalized = normalizeTagList(raw)
  if (!normalized) {
    appendFieldError(fieldErrors, 'tags', 'Unable to normalize tags')
    return []
  }
  return normalized.slice().sort((a, b) => a.localeCompare(b))
}

function normalizeScheduledDate(
  rawValue: unknown,
  fieldErrors: ListFilterFieldErrors
): string | null {
  if (rawValue == null) return null
  if (typeof rawValue !== 'string') {
    appendFieldError(fieldErrors, 'scheduled_date', 'scheduled_date must be a string')
    return null
  }
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  const parsed = parseIsoDateOnly(trimmed)
  if (!parsed) {
    appendFieldError(
      fieldErrors,
      'scheduled_date',
      `Invalid scheduled_date: ${rawValue}`
    )
    return null
  }
  return parsed
}

function normalizeSlot(
  rawValue: unknown,
  fieldErrors: ListFilterFieldErrors
): PlannerSlot | null {
  if (rawValue == null) return null
  if (typeof rawValue !== 'string') {
    appendFieldError(fieldErrors, 'slot', 'slot must be a string')
    return null
  }
  const slot = normalizePlannerSlotAlias(rawValue)
  if (!slot) {
    appendFieldError(fieldErrors, 'slot', `Invalid slot: ${rawValue}`)
  }
  return slot
}

export function emptyCanonicalListFilters(): CanonicalListFilters {
  return {
    categories: [],
    tags: [],
    scheduled_date: null,
    slot: null,
  }
}

export function normalizeCategoryAlias(input: string): CategoryEnum | null {
  const key = normalizeAliasKey(input)
  if (!key) return null
  const direct = CATEGORY_ALIAS_MAP[key]
  if (direct) return direct
  const maybeEnum = CATEGORY_ENUM_VALUES.find(
    (value) => normalizeAliasKey(value) === key
  )
  return maybeEnum ?? null
}

export function normalizePlannerSlotAlias(input: string): PlannerSlot | null {
  const key = normalizeAliasKey(input)
  return SLOT_ALIAS_MAP[key] ?? null
}

export function parseListFilterPayload(
  input: unknown
): ParseListFilterPayloadResult {
  if (input == null) {
    return { ok: true, canonical: emptyCanonicalListFilters(), hasAny: false }
  }
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid_filter_payload',
      message: 'Filter payload must be a JSON object',
      fieldErrors: {
        payload: ['Filter payload must be a JSON object'],
      },
    }
  }

  const payload = input as FilterPayloadInput
  const fieldErrors: ListFilterFieldErrors = {}
  const categories = normalizeCategoryList(
    payload.categories ?? payload.types ?? payload.category ?? payload.type,
    fieldErrors
  )
  const tags = normalizeTagListStrict(payload.tags, fieldErrors)
  const scheduled_date = normalizeScheduledDate(
    payload.scheduled_date ?? payload.date,
    fieldErrors
  )
  const slot = normalizeSlot(payload.slot, fieldErrors)

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'invalid_filter_payload',
      message: 'One or more filters are invalid.',
      fieldErrors,
    }
  }

  const canonical: CanonicalListFilters = {
    categories,
    tags,
    scheduled_date,
    slot,
  }

  const hasAny =
    categories.length > 0 ||
    tags.length > 0 ||
    scheduled_date !== null ||
    slot !== null

  return { ok: true, canonical, hasAny }
}

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

  return sortCategories(Array.from(seen))
}

export function matchesCanonicalListFilters(
  item: {
    place?: { category?: string | null } | null
    tags?: string[] | null
    scheduled_date?: string | null
    scheduled_start_time?: string | null
  },
  filters: CanonicalListFilters
): boolean {
  if (filters.categories.length) {
    const category = item.place?.category
    if (!isCategoryEnum(category) || !filters.categories.includes(category)) {
      return false
    }
  }

  if (filters.tags.length) {
    const itemTagSet = new Set<string>()
    for (const rawTag of item.tags ?? []) {
      if (typeof rawTag !== 'string') continue
      const normalized = normalizeTag(rawTag)
      if (!normalized) continue
      itemTagSet.add(normalized)
    }
    if (!filters.tags.some((tag) => itemTagSet.has(tag))) {
      return false
    }
  }

  if (filters.scheduled_date && item.scheduled_date !== filters.scheduled_date) {
    return false
  }

  if (filters.slot) {
    const slot = slotFromScheduledStartTime(item.scheduled_start_time)
    if (slot !== filters.slot) {
      return false
    }
  }

  return true
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
