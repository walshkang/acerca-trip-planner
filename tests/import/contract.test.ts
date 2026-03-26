import { describe, expect, it } from 'vitest'
import {
  IMPORT_ROW_LIMIT_V1,
  parseImportCommitRequest,
  parseImportPreviewRequest,
} from '@/lib/import/contract'

function makeCommitRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    row_index: i,
    google_place_id: `ChIJtest${i}`,
  }))
}

describe('parseImportCommitRequest', () => {
  it('accepts a valid minimal commit', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJabc' }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request.confirmed_rows).toHaveLength(1)
      expect(result.request.confirmed_rows[0].google_place_id).toBe('ChIJabc')
    }
  })

  it('accepts preview_id when provided', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJx' }],
      preview_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request.preview_id).toBe('550e8400-e29b-41d4-a716-446655440000')
    }
  })

  it('rejects missing confirmed_rows', () => {
    const result = parseImportCommitRequest({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid_import_commit_payload')
      expect(result.fieldErrors.confirmed_rows?.length).toBeGreaterThan(0)
    }
  })

  it('rejects empty confirmed_rows', () => {
    const result = parseImportCommitRequest({ confirmed_rows: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid_import_commit_payload')
    }
  })

  it('rejects more than IMPORT_ROW_LIMIT_V1 rows', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: makeCommitRows(IMPORT_ROW_LIMIT_V1 + 1),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('row_limit_exceeded')
    }
  })

  it('rejects unknown top-level keys', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJx' }],
      extra: true,
    } as Record<string, unknown>)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.payload?.some((m) => m.includes('Unknown field'))).toBe(
        true
      )
    }
  })

  it('rejects negative row_index', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: -1, google_place_id: 'ChIJx' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects non-integer row_index', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 1.5, google_place_id: 'ChIJx' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects missing google_place_id', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 0, google_place_id: '' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects omitted google_place_id on a row', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [{ row_index: 0 } as Record<string, unknown>],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors['confirmed_rows[0].google_place_id']?.length).toBeGreaterThan(
        0
      )
    }
  })

  it('rejects scheduled_date without scheduled_slot', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [
        { row_index: 0, google_place_id: 'ChIJx', scheduled_date: '2026-04-01' },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.fieldErrors['confirmed_rows[0].scheduled_date']?.length
      ).toBeGreaterThan(0)
    }
  })

  it('rejects scheduled_slot without scheduled_date', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [
        { row_index: 0, google_place_id: 'ChIJx', scheduled_slot: 'morning' },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('accepts both scheduled_date and scheduled_slot', () => {
    const result = parseImportCommitRequest({
      confirmed_rows: [
        {
          row_index: 0,
          google_place_id: 'ChIJx',
          scheduled_date: '2026-04-01',
          scheduled_slot: 'afternoon',
        },
      ],
    })
    expect(result.ok).toBe(true)
  })
})

describe('parseImportPreviewRequest', () => {
  it('accepts a minimal valid request (one row, place_name only)', () => {
    const result = parseImportPreviewRequest({ rows: [{ place_name: 'Cafe' }] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request.rows).toEqual([{ place_name: 'Cafe' }])
    }
  })

  it('accepts full optional fields on rows and trip bounds', () => {
    const result = parseImportPreviewRequest({
      rows: [
        {
          place_name: ' Museum ',
          place_category: 'Sights',
          scheduled_date: '2026-04-01',
          scheduled_slot: 'morning',
          item_tags: ['must-see'],
          notes: 'Book ahead',
        },
      ],
      trip_start_date: '2026-04-01',
      trip_end_date: '2026-04-03',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request.rows[0].place_name).toBe('Museum')
      expect(result.request.rows[0].place_category).toBe('Sights')
      expect(result.request.trip_start_date).toBe('2026-04-01')
      expect(result.request.trip_end_date).toBe('2026-04-03')
    }
  })

  it('rejects missing or non-array rows', () => {
    expect(parseImportPreviewRequest({}).ok).toBe(false)
    const noRows = parseImportPreviewRequest({})
    if (!noRows.ok) {
      expect(noRows.fieldErrors.rows?.length).toBeGreaterThan(0)
    }
    const badRows = parseImportPreviewRequest({ rows: 'nope' as unknown as [] })
    expect(badRows.ok).toBe(false)
  })

  it('rejects empty rows array', () => {
    const result = parseImportPreviewRequest({ rows: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.rows?.some((m) => m.includes('empty'))).toBe(true)
    }
  })

  it('rejects more than IMPORT_ROW_LIMIT_V1 rows', () => {
    const rows = Array.from({ length: IMPORT_ROW_LIMIT_V1 + 1 }, (_, i) => ({
      place_name: `P${i}`,
    }))
    const result = parseImportPreviewRequest({ rows })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('row_limit_exceeded')
    }
  })

  it('rejects unknown top-level keys', () => {
    const result = parseImportPreviewRequest({
      rows: [{ place_name: 'x' }],
      extra: 1,
    } as Record<string, unknown>)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.payload?.some((m) => m.includes('Unknown field'))).toBe(true)
    }
  })

  it('rejects row missing or empty place_name', () => {
    const a = parseImportPreviewRequest({
      rows: [{ place_name: '' }],
    })
    expect(a.ok).toBe(false)
    if (!a.ok) {
      expect(a.fieldErrors['rows[0].place_name']?.length).toBeGreaterThan(0)
    }
    const b = parseImportPreviewRequest({
      rows: [{} as { place_name: string }],
    })
    expect(b.ok).toBe(false)
  })

  it('rejects invalid place_category, scheduled_date, scheduled_slot, item_tags', () => {
    const result = parseImportPreviewRequest({
      rows: [
        {
          place_name: 'x',
          place_category: 'NotACategory' as 'Food',
          scheduled_date: '04-01-2026',
          scheduled_slot: 'noon' as 'morning',
          item_tags: 'tags' as unknown as string[],
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors['rows[0].place_category']).toBeDefined()
      expect(result.fieldErrors['rows[0].scheduled_date']).toBeDefined()
      expect(result.fieldErrors['rows[0].scheduled_slot']).toBeDefined()
      expect(result.fieldErrors['rows[0].item_tags']).toBeDefined()
    }
  })

  it('returns multiple field errors together', () => {
    const result = parseImportPreviewRequest({
      rows: [{ place_name: '' }],
      bogus: true,
    } as Record<string, unknown>)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const keys = Object.keys(result.fieldErrors)
      expect(keys.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('still accepts 25 preview rows (sanity next to commit limit)', () => {
    const rows = Array.from({ length: IMPORT_ROW_LIMIT_V1 }, (_, i) => ({
      place_name: `Place ${i}`,
    }))
    const result = parseImportPreviewRequest({ rows })
    expect(result.ok).toBe(true)
  })
})
