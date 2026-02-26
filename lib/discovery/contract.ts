import type { CanonicalServerFilters, ServerFilterFieldErrors } from '@/lib/filters/schema'
import { parseServerFilterPayload } from '@/lib/filters/schema'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 10
const DEFAULT_RADIUS_METERS = 20000
const MAX_RADIUS_METERS = 100000
const MIN_RADIUS_METERS = 1000

const ALLOWED_KEYS = new Set([
  'intent',
  'list_id',
  'lat',
  'lng',
  'radius_m',
  'limit',
  'include_summary',
])

export type DiscoverySuggestField =
  | 'payload'
  | 'intent'
  | 'list_id'
  | 'lat'
  | 'lng'
  | 'radius_m'
  | 'limit'
  | 'include_summary'

export type DiscoverySuggestFieldErrors = Partial<
  Record<DiscoverySuggestField, string[]>
>

export type DiscoverySuggestRequest = {
  intent?: unknown
  list_id?: unknown
  lat?: unknown
  lng?: unknown
  radius_m?: unknown
  limit?: unknown
  include_summary?: unknown
  [key: string]: unknown
}

export type CanonicalDiscoverySuggestRequest = {
  intent: string
  list_id: string | null
  bias: {
    lat: number
    lng: number
    radius_m: number
  } | null
  limit: number
  include_summary: boolean
}

export type DiscoverySuggestionSource = 'google_search' | 'places_index'

export type DiscoverySuggestion = {
  source: DiscoverySuggestionSource
  source_id: string
  name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  neighborhood: string | null
  borough: string | null
  matched_place_id: string | null
  score: number
  rank: number
  reasons: string[]
}

export type DiscoverySummary = {
  text: string
  model: string
  promptVersion: string
  usedFallback: boolean
}

export type DiscoverySuggestSuccessPayload = {
  status: 'ok'
  canonicalRequest: CanonicalDiscoverySuggestRequest
  canonicalFilters: CanonicalServerFilters | null
  suggestions: DiscoverySuggestion[]
  summary: DiscoverySummary | null
  meta: {
    retrieved_count: number
    returned_count: number
    pipeline_version: string
  }
}

export type DiscoverySuggestErrorCode =
  | 'invalid_discovery_payload'
  | 'unauthorized'
  | 'not_found'
  | 'discovery_provider_bad_gateway'
  | 'discovery_provider_unavailable'
  | 'internal_error'

export type DiscoverySuggestErrorPayload = {
  code: DiscoverySuggestErrorCode
  message: string
  fieldErrors?: DiscoverySuggestFieldErrors
  lastValidCanonicalRequest?: CanonicalDiscoverySuggestRequest | null
}

export type ParseDiscoverySuggestRequestResult =
  | {
      ok: true
      canonical: CanonicalDiscoverySuggestRequest
    }
  | {
      ok: false
      code: 'invalid_discovery_payload'
      message: string
      fieldErrors: DiscoverySuggestFieldErrors
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function appendFieldError(
  fieldErrors: DiscoverySuggestFieldErrors,
  field: DiscoverySuggestField,
  message: string
) {
  const existing = fieldErrors[field] ?? []
  fieldErrors[field] = [...existing, message]
}

function parseNumberInput(
  input: unknown,
  field: DiscoverySuggestField,
  fieldErrors: DiscoverySuggestFieldErrors
): number | null {
  if (input == null) return null
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    appendFieldError(fieldErrors, field, `${field} must be a finite number`)
    return null
  }
  return input
}

function mergeFilterFieldErrors(
  fieldErrors: DiscoverySuggestFieldErrors,
  incoming: ServerFilterFieldErrors
) {
  const messages = incoming.within_list_id ?? []
  for (const message of messages) {
    appendFieldError(fieldErrors, 'list_id', message)
  }
}

export function parseDiscoverySuggestRequest(
  input: unknown
): ParseDiscoverySuggestRequestResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid_discovery_payload',
      message: 'Discovery suggest payload must be a JSON object',
      fieldErrors: {
        payload: ['Discovery suggest payload must be a JSON object'],
      },
    }
  }

  const payload = input as DiscoverySuggestRequest
  const fieldErrors: DiscoverySuggestFieldErrors = {}

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_KEYS.has(key)) {
      appendFieldError(fieldErrors, 'payload', `Unknown field: ${key}`)
    }
  }

  let intent: string | null = null
  if (typeof payload.intent !== 'string') {
    appendFieldError(fieldErrors, 'intent', 'intent is required and must be a string')
  } else {
    const trimmed = payload.intent.trim()
    if (!trimmed) {
      appendFieldError(fieldErrors, 'intent', 'intent must be a non-empty string')
    } else {
      intent = trimmed.slice(0, 500)
    }
  }

  let listId: string | null = null
  if (Object.prototype.hasOwnProperty.call(payload, 'list_id')) {
    if (payload.list_id == null) {
      listId = null
    } else if (typeof payload.list_id !== 'string') {
      appendFieldError(fieldErrors, 'list_id', 'list_id must be a UUID string')
    } else {
      const trimmed = payload.list_id.trim()
      if (trimmed) {
        const parsedListId = parseServerFilterPayload({ within_list_id: trimmed })
        if (!parsedListId.ok) {
          mergeFilterFieldErrors(fieldErrors, parsedListId.fieldErrors)
        } else {
          listId = parsedListId.canonical.within_list_id
        }
      }
    }
  }

  const lat = parseNumberInput(payload.lat, 'lat', fieldErrors)
  const lng = parseNumberInput(payload.lng, 'lng', fieldErrors)
  const radiusInput = parseNumberInput(payload.radius_m, 'radius_m', fieldErrors)

  let bias: CanonicalDiscoverySuggestRequest['bias'] = null
  const hasLat = lat !== null
  const hasLng = lng !== null
  if (hasLat !== hasLng) {
    appendFieldError(fieldErrors, 'payload', 'lat and lng must be provided together')
  } else if (hasLat && hasLng) {
    const radiusMeters =
      radiusInput === null
        ? DEFAULT_RADIUS_METERS
        : Math.min(Math.max(Math.round(radiusInput), MIN_RADIUS_METERS), MAX_RADIUS_METERS)
    bias = {
      lat,
      lng,
      radius_m: radiusMeters,
    }
  }

  let limit = DEFAULT_LIMIT
  if (Object.prototype.hasOwnProperty.call(payload, 'limit')) {
    const parsedLimit = parseNumberInput(payload.limit, 'limit', fieldErrors)
    if (parsedLimit !== null) {
      limit = Math.min(Math.max(Math.round(parsedLimit), 1), MAX_LIMIT)
    }
  }

  let includeSummary = false
  if (Object.prototype.hasOwnProperty.call(payload, 'include_summary')) {
    if (typeof payload.include_summary !== 'boolean') {
      appendFieldError(
        fieldErrors,
        'include_summary',
        'include_summary must be a boolean'
      )
    } else {
      includeSummary = payload.include_summary
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !intent) {
    return {
      ok: false,
      code: 'invalid_discovery_payload',
      message: 'Discovery suggest payload is invalid',
      fieldErrors,
    }
  }

  return {
    ok: true,
    canonical: {
      intent,
      list_id: listId,
      bias,
      limit,
      include_summary: includeSummary,
    },
  }
}
