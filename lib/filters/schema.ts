import { normalizeTagList } from '@/lib/lists/tags'
import { CATEGORY_ENUM_VALUES, ENERGY_ENUM_VALUES } from '@/lib/types/enums'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'

const CATEGORY_ORDER = new Map(
  CATEGORY_ENUM_VALUES.map((value, index) => [value, index])
)
const ENERGY_ORDER = new Map(
  ENERGY_ENUM_VALUES.map((value, index) => [value, index])
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

const ENERGY_ALIAS_MAP: Record<string, EnergyEnum> = {
  low: 'Low',
  relaxed: 'Low',
  calm: 'Low',
  medium: 'Medium',
  med: 'Medium',
  moderate: 'Medium',
  high: 'High',
  intense: 'High',
}

const ALLOWED_FILTER_KEYS = new Set([
  'category',
  'categories',
  'type',
  'types',
  'energy',
  'energies',
  'tags',
  'open_now',
  'within_list_id',
])

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type CanonicalServerFilters = {
  category: CategoryEnum[]
  energy: EnergyEnum[]
  tags: string[]
  open_now: boolean | null
  within_list_id: string | null
}

export type ServerFilterField =
  | 'payload'
  | 'category'
  | 'energy'
  | 'tags'
  | 'open_now'
  | 'within_list_id'

export type ServerFilterFieldErrors = Partial<Record<ServerFilterField, string[]>>

export type ParseServerFilterPayloadResult =
  | {
      ok: true
      canonical: CanonicalServerFilters
      hasAny: boolean
    }
  | {
      ok: false
      code: 'invalid_filter_payload'
      message: string
      fieldErrors: ServerFilterFieldErrors
    }

type FilterPayloadInput = {
  category?: unknown
  categories?: unknown
  type?: unknown
  types?: unknown
  energy?: unknown
  energies?: unknown
  tags?: unknown
  open_now?: unknown
  within_list_id?: unknown
}

function normalizeAliasKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function appendFieldError(
  fieldErrors: ServerFilterFieldErrors,
  field: ServerFilterField,
  message: string
) {
  const existing = fieldErrors[field] ?? []
  fieldErrors[field] = [...existing, message]
}

function splitCsv(input: string): string[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function parseStringList(
  rawValue: unknown,
  field: ServerFilterField,
  fieldErrors: ServerFilterFieldErrors
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

function sortEnergy(values: EnergyEnum[]): EnergyEnum[] {
  return values.slice().sort((a, b) => {
    const orderA = ENERGY_ORDER.get(a) ?? 999
    const orderB = ENERGY_ORDER.get(b) ?? 999
    return orderA - orderB
  })
}

function normalizeCategoryAlias(input: string): CategoryEnum | null {
  const key = normalizeAliasKey(input)
  if (!key) return null
  const direct = CATEGORY_ALIAS_MAP[key]
  if (direct) return direct
  const maybeEnum = CATEGORY_ENUM_VALUES.find(
    (value) => normalizeAliasKey(value) === key
  )
  return maybeEnum ?? null
}

function normalizeEnergyAlias(input: string): EnergyEnum | null {
  const key = normalizeAliasKey(input)
  if (!key) return null
  const direct = ENERGY_ALIAS_MAP[key]
  if (direct) return direct
  const maybeEnum = ENERGY_ENUM_VALUES.find(
    (value) => normalizeAliasKey(value) === key
  )
  return maybeEnum ?? null
}

function normalizeCategoryList(
  rawValue: unknown,
  fieldErrors: ServerFilterFieldErrors
): CategoryEnum[] {
  const raw = parseStringList(rawValue, 'category', fieldErrors)
  if (!raw) return []
  const seen = new Set<CategoryEnum>()
  const normalized: CategoryEnum[] = []
  for (const value of raw) {
    const category = normalizeCategoryAlias(value)
    if (!category) {
      appendFieldError(fieldErrors, 'category', `Unknown category alias: ${value}`)
      continue
    }
    if (seen.has(category)) continue
    seen.add(category)
    normalized.push(category)
  }
  return sortCategories(normalized)
}

function normalizeEnergyList(
  rawValue: unknown,
  fieldErrors: ServerFilterFieldErrors
): EnergyEnum[] {
  const raw = parseStringList(rawValue, 'energy', fieldErrors)
  if (!raw) return []
  const seen = new Set<EnergyEnum>()
  const normalized: EnergyEnum[] = []
  for (const value of raw) {
    const energy = normalizeEnergyAlias(value)
    if (!energy) {
      appendFieldError(fieldErrors, 'energy', `Unknown energy alias: ${value}`)
      continue
    }
    if (seen.has(energy)) continue
    seen.add(energy)
    normalized.push(energy)
  }
  return sortEnergy(normalized)
}

function normalizeTagListStrict(
  rawValue: unknown,
  fieldErrors: ServerFilterFieldErrors
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

function normalizeOpenNow(
  rawValue: unknown,
  fieldErrors: ServerFilterFieldErrors
): boolean | null {
  if (rawValue == null) return null
  if (typeof rawValue === 'boolean') return rawValue
  if (typeof rawValue === 'string') {
    const key = normalizeAliasKey(rawValue)
    if (['true', '1', 'yes', 'y', 'open', 'on'].includes(key)) return true
    if (['false', '0', 'no', 'n', 'closed', 'off'].includes(key)) return false
  }
  appendFieldError(
    fieldErrors,
    'open_now',
    'open_now must be a boolean or boolean-like string'
  )
  return null
}

function normalizeWithinListId(
  rawValue: unknown,
  fieldErrors: ServerFilterFieldErrors
): string | null {
  if (rawValue == null) return null
  if (typeof rawValue !== 'string') {
    appendFieldError(
      fieldErrors,
      'within_list_id',
      'within_list_id must be a UUID string'
    )
    return null
  }

  const trimmed = rawValue.trim()
  if (!trimmed) return null
  if (!UUID_V4_REGEX.test(trimmed)) {
    appendFieldError(
      fieldErrors,
      'within_list_id',
      `Invalid within_list_id: ${rawValue}`
    )
    return null
  }
  return trimmed
}

function collectUnknownKeys(
  payload: Record<string, unknown>,
  fieldErrors: ServerFilterFieldErrors
) {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FILTER_KEYS.has(key)) {
      appendFieldError(fieldErrors, 'payload', `Unknown filter field: ${key}`)
    }
  }
}

export function emptyCanonicalServerFilters(): CanonicalServerFilters {
  return {
    category: [],
    energy: [],
    tags: [],
    open_now: null,
    within_list_id: null,
  }
}

export function parseServerFilterPayload(
  input: unknown
): ParseServerFilterPayloadResult {
  if (input == null) {
    return {
      ok: true,
      canonical: emptyCanonicalServerFilters(),
      hasAny: false,
    }
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

  const payload = input as FilterPayloadInput & Record<string, unknown>
  const fieldErrors: ServerFilterFieldErrors = {}

  collectUnknownKeys(payload, fieldErrors)

  const category = normalizeCategoryList(
    payload.category ?? payload.categories ?? payload.type ?? payload.types,
    fieldErrors
  )
  const energy = normalizeEnergyList(payload.energy ?? payload.energies, fieldErrors)
  const tags = normalizeTagListStrict(payload.tags, fieldErrors)
  const open_now = normalizeOpenNow(payload.open_now, fieldErrors)
  const within_list_id = normalizeWithinListId(payload.within_list_id, fieldErrors)

  if (tags.length > 0 && within_list_id === null) {
    appendFieldError(fieldErrors, 'tags', 'tags filter requires within_list_id')
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'invalid_filter_payload',
      message: 'One or more filters are invalid.',
      fieldErrors,
    }
  }

  const canonical: CanonicalServerFilters = {
    category,
    energy,
    tags,
    open_now,
    within_list_id,
  }

  const hasAny =
    category.length > 0 ||
    energy.length > 0 ||
    tags.length > 0 ||
    open_now !== null ||
    within_list_id !== null

  return { ok: true, canonical, hasAny }
}
