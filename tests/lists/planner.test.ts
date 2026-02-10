import { describe, expect, it } from 'vitest'
import type { CategoryEnum } from '@/lib/types/enums'
import {
  comparePlannerCategories,
  countIsoDatesInclusive,
  enumerateIsoDatesInclusive,
  fractionalOrderBetween,
  isoDateInTimezone,
  parseIsoDateOnly,
  scheduledStartTimeFromSlot,
  slotFromScheduledStartTime,
} from '@/lib/lists/planner'

describe('planner helpers', () => {
  it('maps planner slots to sentinel times and back', () => {
    expect(scheduledStartTimeFromSlot('morning').slice(0, 5)).toBe('09:00')
    expect(scheduledStartTimeFromSlot('afternoon').slice(0, 5)).toBe('14:00')
    expect(scheduledStartTimeFromSlot('evening').slice(0, 5)).toBe('19:00')

    expect(slotFromScheduledStartTime('09:00')).toBe('morning')
    expect(slotFromScheduledStartTime('09:00:00')).toBe('morning')
    expect(slotFromScheduledStartTime('14:00:00')).toBe('afternoon')
    expect(slotFromScheduledStartTime('19:00:00')).toBe('evening')
    expect(slotFromScheduledStartTime('10:00:00')).toBeNull()
  })

  it('parses YYYY-MM-DD date strings', () => {
    expect(parseIsoDateOnly('2026-02-07')).toBe('2026-02-07')
    expect(parseIsoDateOnly('2026-02-30')).toBeNull()
    expect(parseIsoDateOnly('02-07-2026')).toBeNull()
  })

  it('enumerates inclusive trip date ranges', () => {
    expect(enumerateIsoDatesInclusive('2026-02-07', '2026-02-07')).toEqual([
      '2026-02-07',
    ])
    expect(enumerateIsoDatesInclusive('2026-02-07', '2026-02-09')).toEqual([
      '2026-02-07',
      '2026-02-08',
      '2026-02-09',
    ])
    expect(enumerateIsoDatesInclusive('2026-02-09', '2026-02-07')).toBeNull()
  })

  it('counts inclusive trip date ranges', () => {
    expect(countIsoDatesInclusive('2026-02-07', '2026-02-07')).toBe(1)
    expect(countIsoDatesInclusive('2026-02-07', '2026-02-09')).toBe(3)
    expect(countIsoDatesInclusive('2026-02-09', '2026-02-07')).toBeNull()
  })

  it('sorts categories in planner lane order', () => {
    const unordered: CategoryEnum[] = [
      'Shop',
      'Food',
      'Drinks',
      'Activity',
      'Sights',
      'Coffee',
    ]

    expect(unordered.sort(comparePlannerCategories)).toEqual([
      'Food',
      'Coffee',
      'Sights',
      'Activity',
      'Shop',
      'Drinks',
    ])
  })

  it('computes fractional scheduled order between neighbors', () => {
    expect(fractionalOrderBetween(2, 4)).toBe(3)
    expect(fractionalOrderBetween(2, null)).toBe(3)
    expect(fractionalOrderBetween(null, 2)).toBe(1)
    expect(fractionalOrderBetween(null, null)).toBe(1)
  })

  it('derives ISO dates in the requested timezone', () => {
    const reference = new Date('2026-02-10T02:30:00.000Z')

    expect(isoDateInTimezone('UTC', reference)).toBe('2026-02-10')
    expect(isoDateInTimezone('America/New_York', reference)).toBe('2026-02-09')
    expect(isoDateInTimezone('Asia/Tokyo', reference)).toBe('2026-02-10')
  })

  it('falls back to UTC date when timezone is invalid', () => {
    const reference = new Date('2026-02-10T02:30:00.000Z')
    expect(isoDateInTimezone('Invalid/Timezone', reference)).toBe('2026-02-10')
  })
})
