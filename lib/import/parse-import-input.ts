import type { ImportRow } from '@/lib/import/contract'
import { IMPORT_ROW_LIMIT_V1 } from '@/lib/import/contract'
import { PLANNER_SLOT_LABEL, parseIsoDateOnly, type PlannerSlot } from '@/lib/lists/planner'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'

export type ParseImportInputResult =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; message: string }

/** Split CSV into rows of fields (RFC 4180: quoted fields, escaped quotes). */
export function parseCsvToMatrix(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  const s = text.replace(/^\uFEFF/, '')

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (c === '\r') {
      i += 1
      if (s[i] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      continue
    }
    if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i += 1
      continue
    }
    field += c
    i += 1
  }
  row.push(field)
  rows.push(row)

  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === '')) {
    rows.pop()
  }

  return rows
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

const HEADER_TO_CANON: Record<string, string> = {
  name: 'name',
  category: 'category',
  day: 'day',
  slot: 'slot',
  'item tags': 'item_tags',
  notes: 'notes',
  'google place id': 'google_place_id',
  'google maps': 'google_maps',
}

function slotFromLabel(raw: string): PlannerSlot | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const lower = t.toLowerCase()
  for (const slot of ['morning', 'afternoon', 'evening'] as const) {
    if (PLANNER_SLOT_LABEL[slot].toLowerCase() === lower) return slot
  }
  if (lower === 'morning' || lower === 'afternoon' || lower === 'evening') {
    return lower as PlannerSlot
  }
  return undefined
}

function categoryFromCell(raw: string): CategoryEnum | undefined {
  const t = raw.trim()
  if (!t) return undefined
  return (CATEGORY_ENUM_VALUES as readonly string[]).includes(t) ? (t as CategoryEnum) : undefined
}

function splitTags(raw: string): string[] {
  return raw
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean)
}

function resolvePlaceName(
  name: string,
  googlePlaceId: string,
  googleMaps: string
): string {
  const n = name.trim()
  if (n) return n
  const id = googlePlaceId.trim()
  if (id) return id
  return googleMaps.trim()
}

function importRowFromCsvCells(
  canonToValue: Map<string, string>
): ImportRow | null {
  const name = canonToValue.get('name') ?? ''
  const googlePlaceId = canonToValue.get('google_place_id') ?? ''
  const googleMaps = canonToValue.get('google_maps') ?? ''
  const place_name = resolvePlaceName(name, googlePlaceId, googleMaps)
  if (!place_name) return null

  const row: ImportRow = { place_name }

  const cat = categoryFromCell(canonToValue.get('category') ?? '')
  if (cat) row.place_category = cat

  const dayRaw = (canonToValue.get('day') ?? '').trim()
  if (dayRaw) {
    const d = parseIsoDateOnly(dayRaw)
    if (d) row.scheduled_date = d
  }

  const slot = slotFromLabel(canonToValue.get('slot') ?? '')
  if (slot) row.scheduled_slot = slot

  const tagsRaw = canonToValue.get('item_tags') ?? ''
  const tags = splitTags(tagsRaw)
  if (tags.length) row.item_tags = tags

  const notes = (canonToValue.get('notes') ?? '').trim()
  if (notes) row.notes = notes

  return row
}

export function parseImportCsv(text: string): ParseImportInputResult {
  const matrix = parseCsvToMatrix(text.trim())
  if (matrix.length < 2) {
    return { ok: false, message: 'CSV needs a header row and at least one data row.' }
  }

  const headerRow = matrix[0]
  const colIndex = new Map<string, number>()
  for (let c = 0; c < headerRow.length; c++) {
    const canon = HEADER_TO_CANON[normalizeHeader(headerRow[c])]
    if (canon && !colIndex.has(canon)) {
      colIndex.set(canon, c)
    }
  }

  if (!colIndex.has('name') && !colIndex.has('google_place_id') && !colIndex.has('google_maps')) {
    return {
      ok: false,
      message:
        'CSV must include a Name column, or Google Place ID / Google Maps to identify places.',
    }
  }

  const rows: ImportRow[] = []
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r]
    const canonToValue = new Map<string, string>()
    for (const [canon, idx] of colIndex) {
      canonToValue.set(canon, cells[idx] ?? '')
    }
    const row = importRowFromCsvCells(canonToValue)
    if (row) rows.push(row)
  }

  if (rows.length === 0) {
    return { ok: false, message: 'No valid rows found (each row needs a place name or ID).' }
  }

  if (rows.length > IMPORT_ROW_LIMIT_V1) {
    return {
      ok: false,
      message: `Too many rows (${rows.length}). Maximum ${IMPORT_ROW_LIMIT_V1} per import.`,
    }
  }

  return { ok: true, rows }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function importRowFromUnknown(
  obj: unknown,
  index: number
): { ok: true; row: ImportRow } | { ok: false; message: string } {
  if (!isRecord(obj)) {
    return { ok: false, message: `rows[${index}] must be an object` }
  }
  const place_name =
    typeof obj.place_name === 'string' ? obj.place_name.trim() : ''
  if (!place_name) {
    return { ok: false, message: `rows[${index}].place_name is required` }
  }

  const row: ImportRow = { place_name }

  if (obj.place_category !== undefined) {
    const cat = categoryFromCell(String(obj.place_category))
    if (!cat) {
      return {
        ok: false,
        message: `rows[${index}].place_category must be a valid category`,
      }
    }
    row.place_category = cat
  }

  if (obj.scheduled_date !== undefined) {
    if (typeof obj.scheduled_date !== 'string' || !parseIsoDateOnly(obj.scheduled_date)) {
      return {
        ok: false,
        message: `rows[${index}].scheduled_date must be YYYY-MM-DD`,
      }
    }
    row.scheduled_date = obj.scheduled_date
  }

  if (obj.scheduled_slot !== undefined) {
    const slot = slotFromLabel(String(obj.scheduled_slot))
    if (!slot) {
      return {
        ok: false,
        message: `rows[${index}].scheduled_slot must be morning, afternoon, or evening`,
      }
    }
    row.scheduled_slot = slot
  }

  if (obj.item_tags !== undefined) {
    if (!Array.isArray(obj.item_tags) || obj.item_tags.some((t) => typeof t !== 'string')) {
      return {
        ok: false,
        message: `rows[${index}].item_tags must be an array of strings`,
      }
    }
    row.item_tags = obj.item_tags as string[]
  }

  if (obj.notes !== undefined) {
    if (typeof obj.notes !== 'string') {
      return { ok: false, message: `rows[${index}].notes must be a string` }
    }
    row.notes = obj.notes
  }

  return { ok: true, row }
}

/**
 * Parse pasted JSON: either `ImportRow[]` or `{ rows: ImportRow[], trip_start_date?, trip_end_date? }`.
 * Trip dates are not returned here — callers merge list trip bounds when building the preview request.
 */
export function parseImportJson(text: string): ParseImportInputResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false, message: 'Invalid JSON.' }
  }

  let rowArray: unknown[]
  if (Array.isArray(parsed)) {
    rowArray = parsed
  } else if (isRecord(parsed) && Array.isArray(parsed.rows)) {
    rowArray = parsed.rows
  } else {
    return {
      ok: false,
      message: 'JSON must be an array of rows or an object with a "rows" array.',
    }
  }

  if (rowArray.length === 0) {
    return { ok: false, message: 'rows must not be empty.' }
  }

  if (rowArray.length > IMPORT_ROW_LIMIT_V1) {
    return {
      ok: false,
      message: `Too many rows (${rowArray.length}). Maximum ${IMPORT_ROW_LIMIT_V1} per import.`,
    }
  }

  const rows: ImportRow[] = []
  for (let i = 0; i < rowArray.length; i++) {
    const one = importRowFromUnknown(rowArray[i], i)
    if (!one.ok) {
      return { ok: false, message: one.message }
    }
    rows.push(one.row)
  }

  return { ok: true, rows }
}
