import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { PlannerSlot } from '@/lib/lists/planner'

export type ExportFormat = 'clipboard' | 'markdown' | 'csv' | 'google_maps_urls'
export type ExportScope = 'all' | 'backlog' | 'scheduled' | 'done'

export type ExportRequest = {
  format: ExportFormat
  scope?: ExportScope
  categories?: CategoryEnum[]
  tags?: string[]
}

export type ExportRow = {
  // Place
  place_name: string
  place_category: CategoryEnum
  place_energy: EnergyEnum | null
  place_address: string | null
  place_neighborhood: string | null
  place_user_notes: string | null
  place_user_tags: string[]
  place_lat: number | null
  place_lng: number | null
  google_maps_url: string | null
  website: string | null

  // List item context
  item_tags: string[]
  scheduled_date: string | null
  scheduled_slot: PlannerSlot | null
  status: 'backlog' | 'scheduled' | 'done'
}

export const EXPORT_FORMAT_VALUES: readonly ExportFormat[] = [
  'clipboard',
  'markdown',
  'csv',
  'google_maps_urls',
]

export const EXPORT_SCOPE_VALUES: readonly ExportScope[] = [
  'all',
  'backlog',
  'scheduled',
  'done',
]

export const CATEGORY_EMOJI: Record<CategoryEnum, string> = {
  Food: '🍽️',
  Coffee: '☕',
  Sights: '🏛️',
  Activity: '🎯',
  Shop: '🛍️',
  Drinks: '🍸',
}

// Compile-time exhaustiveness check
type MissingCategoryEmoji = Exclude<CategoryEnum, keyof typeof CATEGORY_EMOJI>
type AssertNever<T extends never> = T
export type __CategoryEmojiExhaustive = AssertNever<MissingCategoryEmoji>

function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && (EXPORT_FORMAT_VALUES as string[]).includes(value)
}

function isExportScope(value: unknown): value is ExportScope {
  return typeof value === 'string' && (EXPORT_SCOPE_VALUES as string[]).includes(value)
}

function isCategoryEnum(value: unknown): value is CategoryEnum {
  return typeof value === 'string' && (CATEGORY_ENUM_VALUES as readonly string[]).includes(value)
}

export type ExportRequestValidationError = { field: string; message: string }

export function validateExportRequest(
  body: unknown
): { request: ExportRequest } | { errors: ExportRequestValidationError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    }
  }

  const obj = body as Record<string, unknown>

  // Reject unknown fields
  const knownFields = new Set(['format', 'scope', 'categories', 'tags'])
  for (const key of Object.keys(obj)) {
    if (!knownFields.has(key)) {
      return { errors: [{ field: key, message: `Unknown field: ${key}` }] }
    }
  }

  const errors: ExportRequestValidationError[] = []

  if (!isExportFormat(obj.format)) {
    errors.push({
      field: 'format',
      message: `format is required and must be one of: ${EXPORT_FORMAT_VALUES.join(', ')}`,
    })
  }

  if ('scope' in obj && !isExportScope(obj.scope)) {
    errors.push({
      field: 'scope',
      message: `scope must be one of: ${EXPORT_SCOPE_VALUES.join(', ')}`,
    })
  }

  if ('categories' in obj) {
    if (!Array.isArray(obj.categories)) {
      errors.push({ field: 'categories', message: 'categories must be an array' })
    } else {
      for (const cat of obj.categories) {
        if (!isCategoryEnum(cat)) {
          errors.push({
            field: 'categories',
            message: `Invalid category: ${String(cat)}`,
          })
          break
        }
      }
    }
  }

  if ('tags' in obj) {
    if (!Array.isArray(obj.tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array of strings' })
    } else {
      for (const tag of obj.tags) {
        if (typeof tag !== 'string') {
          errors.push({ field: 'tags', message: 'tags must be an array of strings' })
          break
        }
      }
    }
  }

  if (errors.length > 0) return { errors }

  return {
    request: {
      format: obj.format as ExportFormat,
      scope: (obj.scope as ExportScope | undefined) ?? 'all',
      ...(obj.categories !== undefined
        ? { categories: obj.categories as CategoryEnum[] }
        : {}),
      ...(obj.tags !== undefined ? { tags: obj.tags as string[] } : {}),
    },
  }
}
