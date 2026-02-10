import type { CategoryEnum } from '@/lib/types/enums'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import { CATEGORY_EMOJI_MAP } from '@/lib/icons/mapping'
import { emojiComparisonKey, normalizeEmojiInput } from '@/lib/icons/emoji-input'

export { CATEGORY_EMOJI_MAP }

export type CategoryIconOverrides = Partial<Record<CategoryEnum, string>>
export type ScopedCategoryIconOverrides = Record<string, CategoryIconOverrides>

export const DEFAULT_ICON_SCOPE = '__default__'
export const CATEGORY_ICON_STORAGE_KEY = 'acerca:categoryIconOverridesByScope:v2'
export const CATEGORY_ICON_EVENT = 'acerca:categoryIconOverridesUpdated'

export const CATEGORY_ICON_CHOICES: Record<CategoryEnum, readonly string[]> = {
  Food: ['🍽️', '🍜', '🍕', '🥘', '🌮', '🍣'],
  Coffee: ['☕️', '🫖', '🥐', '🧋', '🍰', '🥤'],
  Sights: ['🏛️', '🗽', '🎨', '🌆', '🏰', '📸'],
  Shop: ['🛍️', '🧢', '🎁', '🧵', '🧴', '🛒'],
  Activity: ['🎯', '🚴', '🎭', '🎲', '⛳️', '🛶'],
  Drinks: ['🍸', '🍷', '🍺', '🥂', '🍹', '🍶'],
}

function normalizeCategoryIconValue(
  category: CategoryEnum,
  value: string
): string | null {
  const normalized = normalizeEmojiInput(value)
  if (!normalized) return null
  if (
    emojiComparisonKey(normalized) ===
    emojiComparisonKey(CATEGORY_EMOJI_MAP[category])
  ) {
    return null
  }
  return normalized
}

export function normalizeCategoryIconOverrides(
  input: unknown
): CategoryIconOverrides {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const raw = input as Record<string, unknown>
  const normalized: CategoryIconOverrides = {}

  for (const category of CATEGORY_ENUM_VALUES) {
    const next = raw[category]
    if (typeof next !== 'string') continue
    const normalizedValue = normalizeCategoryIconValue(category, next)
    if (!normalizedValue) continue
    normalized[category] = normalizedValue
  }

  return normalized
}

export function parseCategoryIconOverrides(
  value: string | null | undefined
): CategoryIconOverrides {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return normalizeCategoryIconOverrides(parsed)
  } catch {
    return {}
  }
}

export function resolveCategoryEmoji(
  category: CategoryEnum,
  overrides?: CategoryIconOverrides
): string {
  const candidate = overrides?.[category]
  if (typeof candidate === 'string') {
    const normalized = normalizeEmojiInput(candidate)
    if (normalized) return normalized
  }
  return CATEGORY_EMOJI_MAP[category]
}

export function serializeCategoryIconOverrides(
  overrides: CategoryIconOverrides
): string {
  return JSON.stringify(normalizeCategoryIconOverrides(overrides))
}

export function normalizeCategoryIconScope(scopeKey: string | null | undefined) {
  const trimmed = typeof scopeKey === 'string' ? scopeKey.trim() : ''
  return trimmed.length ? trimmed : DEFAULT_ICON_SCOPE
}

export function parseScopedCategoryIconOverrides(
  value: string | null | undefined
): ScopedCategoryIconOverrides {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const raw = parsed as Record<string, unknown>
    const hasLegacyCategoryShape = CATEGORY_ENUM_VALUES.some((category) =>
      Object.prototype.hasOwnProperty.call(raw, category)
    )
    if (hasLegacyCategoryShape) {
      const legacy = normalizeCategoryIconOverrides(raw)
      if (!Object.keys(legacy).length) return {}
      return {
        [DEFAULT_ICON_SCOPE]: legacy,
      }
    }

    const scoped: ScopedCategoryIconOverrides = {}
    for (const [rawScope, rawOverrides] of Object.entries(raw)) {
      const scope = normalizeCategoryIconScope(rawScope)
      const normalized = normalizeCategoryIconOverrides(rawOverrides)
      if (!Object.keys(normalized).length) continue
      scoped[scope] = normalized
    }
    return scoped
  } catch {
    return {}
  }
}

export function serializeScopedCategoryIconOverrides(
  overridesByScope: ScopedCategoryIconOverrides
): string {
  const normalizedByScope: ScopedCategoryIconOverrides = {}
  for (const [rawScope, rawOverrides] of Object.entries(overridesByScope)) {
    const scope = normalizeCategoryIconScope(rawScope)
    const normalized = normalizeCategoryIconOverrides(rawOverrides)
    if (!Object.keys(normalized).length) continue
    normalizedByScope[scope] = normalized
  }
  return JSON.stringify(normalizedByScope)
}
