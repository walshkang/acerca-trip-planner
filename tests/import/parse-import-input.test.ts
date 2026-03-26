import { describe, expect, it } from 'vitest'
import { IMPORT_ROW_LIMIT_V1 } from '@/lib/import/contract'
import {
  parseCsvToMatrix,
  parseImportCsv,
  parseImportJson,
} from '@/lib/import/parse-import-input'

describe('parseCsvToMatrix', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsvToMatrix('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles quoted fields with commas', () => {
    expect(parseCsvToMatrix('Name,Notes\n"Cafe, Inc",hello')).toEqual([
      ['Name', 'Notes'],
      ['Cafe, Inc', 'hello'],
    ])
  })

  it('handles escaped quotes', () => {
    expect(parseCsvToMatrix('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']])
  })

  it('strips BOM', () => {
    expect(parseCsvToMatrix('\uFEFFName\nX')).toEqual([['Name'], ['X']])
  })
})

describe('parseImportCsv', () => {
  it('maps export-style headers to ImportRow', () => {
    const csv = [
      'Name,Category,Day,Slot,Item Tags,Notes',
      'Test Cafe,Food,2025-04-01,Morning,a;b,note here',
    ].join('\n')
    const r = parseImportCsv(csv)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toEqual({
      place_name: 'Test Cafe',
      place_category: 'Food',
      scheduled_date: '2025-04-01',
      scheduled_slot: 'morning',
      item_tags: ['a', 'b'],
      notes: 'note here',
    })
  })

  it('uses Google Place ID when Name is empty', () => {
    const csv = ['Google Place ID', 'ChIJabcdefghijk12'].join('\n')
    const r = parseImportCsv(csv)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows[0].place_name).toBe('ChIJabcdefghijk12')
  })

  it('rejects when over row limit', () => {
    const header = 'Name'
    const lines = [header, ...Array.from({ length: IMPORT_ROW_LIMIT_V1 + 1 }, (_, i) => `P${i}`)]
    const r = parseImportCsv(lines.join('\n'))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.message).toContain('Maximum')
  })

  it('skips rows with no place identifier', () => {
    const csv = ['Name,Category', ',Food', 'Ok,Sights'].join('\n')
    const r = parseImportCsv(csv)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].place_name).toBe('Ok')
  })
})

describe('parseImportJson', () => {
  it('accepts a bare array', () => {
    const r = parseImportJson(
      JSON.stringify([{ place_name: 'X', scheduled_slot: 'afternoon' }])
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows[0].scheduled_slot).toBe('afternoon')
  })

  it('accepts wrapper object with rows', () => {
    const r = parseImportJson(
      JSON.stringify({
        rows: [{ place_name: 'Y' }],
        trip_start_date: '2025-01-01',
      })
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.rows).toHaveLength(1)
  })

  it('rejects invalid category', () => {
    const r = parseImportJson(
      JSON.stringify([{ place_name: 'Z', place_category: 'Invalid' }])
    )
    expect(r.ok).toBe(false)
  })
})
