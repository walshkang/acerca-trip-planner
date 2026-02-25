import { parseIsoDateOnly } from '@/lib/lists/planner'
import type { CategoryEnum } from '@/lib/types/enums'

export type RoutingMode = 'scheduled'

export type RoutingPreviewField = 'payload' | 'date' | 'mode'
export type RoutingPreviewFieldErrors = Partial<
  Record<RoutingPreviewField, string[]>
>

export type RoutingPreviewRequest = {
  date?: unknown
  mode?: unknown
  [key: string]: unknown
}

export type CanonicalRoutingPreviewRequest = {
  date: string
  mode: RoutingMode
}

export type RoutingPreviewErrorCode =
  | 'invalid_routing_payload'
  | 'date_outside_trip_range'
  | 'unauthorized'
  | 'not_found'
  | 'internal_error'

export type RoutingPreviewErrorPayload = {
  code: RoutingPreviewErrorCode
  message: string
  fieldErrors?: RoutingPreviewFieldErrors
  lastValidCanonicalRequest?: CanonicalRoutingPreviewRequest | null
}

export type RoutingPreviewListContext = {
  id: string
  name: string
  timezone: string | null
  start_date: string | null
  end_date: string | null
}

export type RoutingSlotKind = 'morning' | 'afternoon' | 'evening' | 'unslotted'

export type RoutingSequenceItem = {
  item_id: string
  place_id: string
  place_name: string
  category: CategoryEnum | null
  scheduled_date: string
  scheduled_start_time: string | null
  scheduled_order: number
  created_at: string
  slot: RoutingSlotKind
  slot_rank: number
  lat: number | null
  lng: number | null
  routeable: boolean
}

export type RoutingUnroutableItem = {
  item_id: string
  place_id: string
  place_name: string
  reason: 'missing_coordinates'
}

export type RoutingLegDraft = {
  index: number
  from_item_id: string
  to_item_id: string
  from_place_id: string
  to_place_id: string
}

export type RoutingPreviewSummary = {
  total_items: number
  routeable_items: number
  unroutable_items: number
  leg_count: number
  total_distance_m: number | null
  total_duration_s: number | null
}

export type RoutingPreviewBasePayload = {
  canonicalRequest: CanonicalRoutingPreviewRequest
  list: RoutingPreviewListContext
  sequence: RoutingSequenceItem[]
  unroutableItems: RoutingUnroutableItem[]
  legs: RoutingLegDraft[]
  summary: RoutingPreviewSummary
}

export type RoutingPreviewInsufficientPayload = RoutingPreviewBasePayload & {
  status: 'insufficient_items'
}

export type RoutingPreviewProviderUnavailablePayload =
  RoutingPreviewBasePayload & {
    code: 'routing_provider_unavailable'
    status: 'provider_unavailable'
    message: string
  }

export type ParseRoutingPreviewRequestResult =
  | {
      ok: true
      canonical: CanonicalRoutingPreviewRequest
    }
  | {
      ok: false
      code: 'invalid_routing_payload'
      message: string
      fieldErrors: RoutingPreviewFieldErrors
    }

const ALLOWED_KEYS = new Set(['date', 'mode'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function appendFieldError(
  fieldErrors: RoutingPreviewFieldErrors,
  field: RoutingPreviewField,
  message: string
) {
  const existing = fieldErrors[field] ?? []
  fieldErrors[field] = [...existing, message]
}

export function parseRoutingPreviewRequest(
  input: unknown
): ParseRoutingPreviewRequestResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid_routing_payload',
      message: 'Routing preview payload must be a JSON object',
      fieldErrors: {
        payload: ['Routing preview payload must be a JSON object'],
      },
    }
  }

  const payload = input as RoutingPreviewRequest
  const fieldErrors: RoutingPreviewFieldErrors = {}

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_KEYS.has(key)) {
      appendFieldError(fieldErrors, 'payload', `Unknown field: ${key}`)
    }
  }

  let date: string | null = null
  if (typeof payload.date !== 'string') {
    appendFieldError(fieldErrors, 'date', 'date is required and must be YYYY-MM-DD')
  } else {
    const parsed = parseIsoDateOnly(payload.date)
    if (!parsed) {
      appendFieldError(fieldErrors, 'date', 'date must be YYYY-MM-DD')
    } else {
      date = parsed
    }
  }

  let mode: RoutingMode = 'scheduled'
  if (Object.prototype.hasOwnProperty.call(payload, 'mode')) {
    if (typeof payload.mode !== 'string') {
      appendFieldError(fieldErrors, 'mode', 'mode must be a string')
    } else if (payload.mode !== 'scheduled') {
      appendFieldError(fieldErrors, 'mode', 'mode must be "scheduled"')
    } else {
      mode = payload.mode
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !date) {
    return {
      ok: false,
      code: 'invalid_routing_payload',
      message: 'Routing preview payload is invalid',
      fieldErrors,
    }
  }

  return {
    ok: true,
    canonical: {
      date,
      mode,
    },
  }
}
