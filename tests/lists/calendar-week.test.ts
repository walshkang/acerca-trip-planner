import { describe, expect, it } from 'vitest'
import {
  addUtcDays,
  buildCalendarWeekRows,
  utcMondayOfWeek,
  utcSundayOfWeek,
} from '@/lib/lists/calendar-week'

describe('calendar week grid (UTC)', () => {
  it('places trip mid-week across two Mon–Sun rows with correct padding', () => {
    const rows = buildCalendarWeekRows('2026-02-18', '2026-02-24')
    expect(rows).not.toBeNull()
    expect(rows!.length).toBe(2)

    expect(rows![0]!.cells).toEqual([
      '2026-02-16',
      '2026-02-17',
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
      '2026-02-21',
      '2026-02-22',
    ])
    expect(rows![1]!.cells).toEqual([
      '2026-02-23',
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ])
  })

  it('returns one row when trip fits in a single week', () => {
    const rows = buildCalendarWeekRows('2026-02-16', '2026-02-22')
    expect(rows).not.toBeNull()
    expect(rows!.length).toBe(1)
    expect(rows![0]!.cells[0]).toBe('2026-02-16')
    expect(rows![0]!.cells[6]).toBe('2026-02-22')
  })

  it('computes Monday and Sunday of the containing UTC week', () => {
    expect(utcMondayOfWeek('2026-02-18')).toBe('2026-02-16')
    expect(utcSundayOfWeek('2026-02-18')).toBe('2026-02-22')
    expect(utcSundayOfWeek('2026-02-24')).toBe('2026-03-01')
  })

  it('addUtcDays steps in UTC', () => {
    expect(addUtcDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('returns null for invalid range', () => {
    expect(buildCalendarWeekRows('2026-02-10', '2026-02-09')).toBeNull()
  })
})
