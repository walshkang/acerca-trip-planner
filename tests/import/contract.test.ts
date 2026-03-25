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
  it('still accepts 25 preview rows (sanity next to commit limit)', () => {
    const rows = Array.from({ length: IMPORT_ROW_LIMIT_V1 }, (_, i) => ({
      place_name: `Place ${i}`,
    }))
    const result = parseImportPreviewRequest({ rows })
    expect(result.ok).toBe(true)
  })
})
