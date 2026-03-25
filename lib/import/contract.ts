import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import { CATEGORY_ENUM_VALUES, ENERGY_ENUM_VALUES } from '@/lib/types/enums'
import type { PlannerSlot } from '@/lib/lists/planner'
import { parseIsoDateOnly } from '@/lib/lists/planner'

// ---------------------------------------------------------------------------
// Slot time ranges for open_during_slot computation
// ---------------------------------------------------------------------------

export const SLOT_TIME_RANGE: Record<PlannerSlot, { start: number; end: number }> = {
  morning: { start: 8, end: 12 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 17, end: 22 },
}

// ---------------------------------------------------------------------------
// Import Row (LLM / client input)
// ---------------------------------------------------------------------------

export type ImportRow = {
  /** Free text place name, Google Maps URL, or ChIJ place id */
  place_name: string
  /** Optional category hint — server may correct */
  place_category?: CategoryEnum
  /** ISO YYYY-MM-DD */
  scheduled_date?: string
  /** morning | afternoon | evening */
  scheduled_slot?: PlannerSlot
  /** Freeform tags */
  item_tags?: string[]
  /** User/LLM notes for context */
  notes?: string
}

// ---------------------------------------------------------------------------
// Import Preview Request / Response
// ---------------------------------------------------------------------------

export const IMPORT_ROW_LIMIT_V1 = 25

export type ImportPreviewRequest = {
  rows: ImportRow[]
  trip_start_date?: string
  trip_end_date?: string
}

export type ResolvedCandidate = {
  google_place_id: string
  place_name: string
  address: string | null
  google_rating: number | null
  lat: number
  lng: number
}

export type ResolvedEnrichment = {
  place_name: string
  google_place_id: string
  neighborhood: string | null
  lat: number
  lng: number
  google_rating: number | null
  google_price_level: number | null
  google_review_count: number | null
  opening_hours: string[] | null
  energy: EnergyEnum
  category: CategoryEnum
  website: string | null
  google_maps_url: string
}

export type ComputedFields = {
  /** null if no hours data */
  open_during_slot: boolean | null
  /** Haversine km from previous item in same-day sequence; null for first item */
  distance_from_previous_km: number | null
  /** Estimated walking minutes (distance / 5 × 60); null if no previous */
  travel_time_minutes: number | null
  /** Another item already occupies this date + slot */
  slot_conflict: boolean
  /** Energy levels of consecutive items up to this one; warn on 3+ High */
  energy_sequence: EnergyEnum[]
}

export type PreviewRowStatus = 'ok' | 'ambiguous' | 'error'

export type PreviewRow = {
  row_index: number
  status: PreviewRowStatus
  error_message: string | null
  candidates: ResolvedCandidate[] | null
  input: ImportRow
  resolved: ResolvedEnrichment | null
  computed: ComputedFields | null
}

export type TripSummary = {
  total_days: number
  empty_slots: { date: string; slot: PlannerSlot }[]
  warnings: string[]
}

export type ImportPreviewResponse = {
  preview_id: string
  rows: PreviewRow[]
  trip_summary: TripSummary
}

// ---------------------------------------------------------------------------
// Import Commit Request / Response
// ---------------------------------------------------------------------------

export type ConfirmedRow = {
  row_index: number
  google_place_id: string
  /** Override scheduled_date from preview */
  scheduled_date?: string
  /** Override scheduled_slot from preview */
  scheduled_slot?: PlannerSlot
  /** Override item_tags from preview */
  item_tags?: string[]
}

export type ImportCommitRequest = {
  confirmed_rows: ConfirmedRow[]
  preview_id?: string
}

export type CommittedRow = {
  row_index: number
  place_id: string
  list_item_id: string
  status: 'created' | 'updated'
}

export type CommitError = {
  row_index: number
  error_message: string
}

export type ImportCommitResponse = {
  committed: CommittedRow[]
  errors: CommitError[]
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type ImportErrorCode =
  | 'invalid_import_payload'
  | 'invalid_import_commit_payload'
  | 'row_limit_exceeded'
  | 'unauthorized'
  | 'list_not_found'
  | 'date_outside_trip_range'
  | 'google_resolution_failed'
  | 'internal_error'

export type ImportErrorPayload = {
  code: ImportErrorCode
  message: string
  fieldErrors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Request parsing & validation
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCategoryEnum(value: unknown): value is CategoryEnum {
  return typeof value === 'string' && (CATEGORY_ENUM_VALUES as readonly string[]).includes(value)
}

function isPlannerSlot(value: unknown): value is PlannerSlot {
  return value === 'morning' || value === 'afternoon' || value === 'evening'
}

export type ParseImportPreviewResult =
  | { ok: true; request: ImportPreviewRequest }
  | { ok: false; code: 'invalid_import_payload' | 'row_limit_exceeded'; message: string; fieldErrors: Record<string, string[]> }

export function parseImportPreviewRequest(input: unknown): ParseImportPreviewResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid_import_payload',
      message: 'Import preview payload must be a JSON object',
      fieldErrors: { payload: ['Import preview payload must be a JSON object'] },
    }
  }

  const allowedKeys = new Set(['rows', 'trip_start_date', 'trip_end_date'])
  const fieldErrors: Record<string, string[]> = {}

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      fieldErrors['payload'] = [...(fieldErrors['payload'] ?? []), `Unknown field: ${key}`]
    }
  }

  // rows
  if (!Array.isArray(input.rows)) {
    fieldErrors['rows'] = ['rows is required and must be an array']
  } else if (input.rows.length === 0) {
    fieldErrors['rows'] = ['rows must not be empty']
  } else if (input.rows.length > IMPORT_ROW_LIMIT_V1) {
    return {
      ok: false,
      code: 'row_limit_exceeded',
      message: `Maximum ${IMPORT_ROW_LIMIT_V1} rows allowed in v1`,
      fieldErrors: { rows: [`Maximum ${IMPORT_ROW_LIMIT_V1} rows allowed`] },
    }
  } else {
    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i]
      if (!isRecord(row)) {
        fieldErrors[`rows[${i}]`] = ['Each row must be a JSON object']
        continue
      }
      if (typeof row.place_name !== 'string' || row.place_name.trim().length === 0) {
        fieldErrors[`rows[${i}].place_name`] = ['place_name is required and must be a non-empty string']
      }
      if (row.place_category !== undefined && !isCategoryEnum(row.place_category)) {
        fieldErrors[`rows[${i}].place_category`] = [
          `place_category must be one of: ${CATEGORY_ENUM_VALUES.join(', ')}`,
        ]
      }
      if (row.scheduled_date !== undefined) {
        if (typeof row.scheduled_date !== 'string' || !parseIsoDateOnly(row.scheduled_date)) {
          fieldErrors[`rows[${i}].scheduled_date`] = ['scheduled_date must be YYYY-MM-DD']
        }
      }
      if (row.scheduled_slot !== undefined && !isPlannerSlot(row.scheduled_slot)) {
        fieldErrors[`rows[${i}].scheduled_slot`] = ['scheduled_slot must be morning, afternoon, or evening']
      }
      if (row.item_tags !== undefined) {
        if (!Array.isArray(row.item_tags) || row.item_tags.some((t: unknown) => typeof t !== 'string')) {
          fieldErrors[`rows[${i}].item_tags`] = ['item_tags must be an array of strings']
        }
      }
      if (row.notes !== undefined && typeof row.notes !== 'string') {
        fieldErrors[`rows[${i}].notes`] = ['notes must be a string']
      }
    }
  }

  // trip dates
  let tripStartDate: string | undefined
  let tripEndDate: string | undefined

  if (input.trip_start_date !== undefined) {
    if (typeof input.trip_start_date !== 'string' || !parseIsoDateOnly(input.trip_start_date)) {
      fieldErrors['trip_start_date'] = ['trip_start_date must be YYYY-MM-DD']
    } else {
      tripStartDate = input.trip_start_date as string
    }
  }
  if (input.trip_end_date !== undefined) {
    if (typeof input.trip_end_date !== 'string' || !parseIsoDateOnly(input.trip_end_date)) {
      fieldErrors['trip_end_date'] = ['trip_end_date must be YYYY-MM-DD']
    } else {
      tripEndDate = input.trip_end_date as string
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'invalid_import_payload',
      message: 'Import preview payload is invalid',
      fieldErrors,
    }
  }

  // Safe to cast — validation passed
  const rows = (input.rows as Record<string, unknown>[]).map((row) => ({
    place_name: (row.place_name as string).trim(),
    ...(row.place_category !== undefined ? { place_category: row.place_category as CategoryEnum } : {}),
    ...(row.scheduled_date !== undefined ? { scheduled_date: row.scheduled_date as string } : {}),
    ...(row.scheduled_slot !== undefined ? { scheduled_slot: row.scheduled_slot as PlannerSlot } : {}),
    ...(row.item_tags !== undefined ? { item_tags: row.item_tags as string[] } : {}),
    ...(row.notes !== undefined ? { notes: row.notes as string } : {}),
  }))

  return {
    ok: true,
    request: {
      rows,
      ...(tripStartDate !== undefined ? { trip_start_date: tripStartDate } : {}),
      ...(tripEndDate !== undefined ? { trip_end_date: tripEndDate } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Commit request parsing
// ---------------------------------------------------------------------------

export type ParseImportCommitResult =
  | { ok: true; request: ImportCommitRequest }
  | { ok: false; code: 'invalid_import_commit_payload'; message: string; fieldErrors: Record<string, string[]> }

export function parseImportCommitRequest(input: unknown): ParseImportCommitResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid_import_commit_payload',
      message: 'Import commit payload must be a JSON object',
      fieldErrors: { payload: ['Import commit payload must be a JSON object'] },
    }
  }

  const allowedKeys = new Set(['confirmed_rows', 'preview_id'])
  const fieldErrors: Record<string, string[]> = {}

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      fieldErrors['payload'] = [...(fieldErrors['payload'] ?? []), `Unknown field: ${key}`]
    }
  }

  if (!Array.isArray(input.confirmed_rows)) {
    fieldErrors['confirmed_rows'] = ['confirmed_rows is required and must be an array']
  } else if (input.confirmed_rows.length === 0) {
    fieldErrors['confirmed_rows'] = ['confirmed_rows must not be empty']
  } else {
    for (let i = 0; i < input.confirmed_rows.length; i++) {
      const row = input.confirmed_rows[i]
      if (!isRecord(row)) {
        fieldErrors[`confirmed_rows[${i}]`] = ['Each confirmed row must be a JSON object']
        continue
      }
      if (typeof row.row_index !== 'number' || !Number.isInteger(row.row_index) || row.row_index < 0) {
        fieldErrors[`confirmed_rows[${i}].row_index`] = ['row_index must be a non-negative integer']
      }
      if (typeof row.google_place_id !== 'string' || row.google_place_id.trim().length === 0) {
        fieldErrors[`confirmed_rows[${i}].google_place_id`] = ['google_place_id is required']
      }
      if (row.scheduled_date !== undefined) {
        if (typeof row.scheduled_date !== 'string' || !parseIsoDateOnly(row.scheduled_date)) {
          fieldErrors[`confirmed_rows[${i}].scheduled_date`] = ['scheduled_date must be YYYY-MM-DD']
        }
      }
      if (row.scheduled_slot !== undefined && !isPlannerSlot(row.scheduled_slot)) {
        fieldErrors[`confirmed_rows[${i}].scheduled_slot`] = ['scheduled_slot must be morning, afternoon, or evening']
      }
      if (row.item_tags !== undefined) {
        if (!Array.isArray(row.item_tags) || row.item_tags.some((t: unknown) => typeof t !== 'string')) {
          fieldErrors[`confirmed_rows[${i}].item_tags`] = ['item_tags must be an array of strings']
        }
      }
    }
  }

  if (input.preview_id !== undefined && typeof input.preview_id !== 'string') {
    fieldErrors['preview_id'] = ['preview_id must be a string']
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'invalid_import_commit_payload',
      message: 'Import commit payload is invalid',
      fieldErrors,
    }
  }

  const confirmedRows = (input.confirmed_rows as Record<string, unknown>[]).map((row) => ({
    row_index: row.row_index as number,
    google_place_id: (row.google_place_id as string).trim(),
    ...(row.scheduled_date !== undefined ? { scheduled_date: row.scheduled_date as string } : {}),
    ...(row.scheduled_slot !== undefined ? { scheduled_slot: row.scheduled_slot as PlannerSlot } : {}),
    ...(row.item_tags !== undefined ? { item_tags: row.item_tags as string[] } : {}),
  }))

  return {
    ok: true,
    request: {
      confirmed_rows: confirmedRows,
      ...(input.preview_id !== undefined ? { preview_id: input.preview_id as string } : {}),
    },
  }
}
