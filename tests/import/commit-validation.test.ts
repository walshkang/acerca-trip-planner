import { describe, expect, it } from 'vitest'
import { scheduledDateOutsideListTripBounds } from '@/lib/import/commit-validation'

describe('scheduledDateOutsideListTripBounds', () => {
  it('returns false when no list bounds', () => {
    expect(
      scheduledDateOutsideListTripBounds('2026-04-01', {
        start_date: null,
        end_date: null,
      })
    ).toBe(false)
  })

  it('returns false when date is on start and end', () => {
    expect(
      scheduledDateOutsideListTripBounds('2026-04-01', {
        start_date: '2026-04-01',
        end_date: '2026-04-03',
      })
    ).toBe(false)
    expect(
      scheduledDateOutsideListTripBounds('2026-04-03', {
        start_date: '2026-04-01',
        end_date: '2026-04-03',
      })
    ).toBe(false)
  })

  it('returns true when date is before start_date', () => {
    expect(
      scheduledDateOutsideListTripBounds('2026-03-31', {
        start_date: '2026-04-01',
        end_date: null,
      })
    ).toBe(true)
  })

  it('returns true when date is after end_date', () => {
    expect(
      scheduledDateOutsideListTripBounds('2026-04-04', {
        start_date: null,
        end_date: '2026-04-03',
      })
    ).toBe(true)
  })
})
