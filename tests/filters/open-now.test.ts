import { describe, expect, it } from 'vitest'
import { evaluateOpenNow } from '@/lib/filters/open-now'

describe('evaluateOpenNow', () => {
  it('evaluates weekly periods using fallback timezone', () => {
    const openingHours = {
      periods: [
        {
          open: { day: 1, time: '0900' },
          close: { day: 1, time: '1700' },
        },
      ],
    }

    const morningUtc = new Date('2026-02-09T15:00:00.000Z') // Monday 10:00 EST
    const lateUtc = new Date('2026-02-09T23:00:00.000Z') // Monday 18:00 EST

    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: morningUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(true)
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: lateUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(false)
  })

  it('handles overnight periods that cross midnight', () => {
    const openingHours = {
      periods: [
        {
          open: { day: 1, time: '2200' },
          close: { day: 2, time: '0200' },
        },
      ],
    }

    const overnightUtc = new Date('2026-02-10T04:00:00.000Z') // Monday 23:00 EST
    const afterCloseUtc = new Date('2026-02-10T09:00:00.000Z') // Tuesday 04:00 EST

    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: overnightUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(true)
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: afterCloseUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(false)
  })

  it('handles DST transition with timezone-aware fallback', () => {
    const openingHours = {
      periods: [
        {
          open: { day: 0, time: '0100' },
          close: { day: 0, time: '0330' },
        },
      ],
    }

    const beforeSpringForwardUtc = new Date('2026-03-08T06:30:00.000Z') // Sunday 01:30 EST
    const afterSpringForwardUtc = new Date('2026-03-08T07:15:00.000Z') // Sunday 03:15 EDT
    const afterCloseUtc = new Date('2026-03-08T07:45:00.000Z') // Sunday 03:45 EDT

    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: beforeSpringForwardUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(true)
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: afterSpringForwardUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(true)
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: afterCloseUtc,
        fallbackTimezone: 'America/New_York',
      })
    ).toBe(false)
  })

  it('uses utc_offset_minutes when timezone is unavailable', () => {
    const openingHours = {
      utc_offset_minutes: 540,
      periods: [
        {
          open: { day: 2, time: '0900' },
          close: { day: 2, time: '1100' },
        },
      ],
    }

    const referenceUtc = new Date('2026-02-10T00:30:00.000Z') // Tuesday 09:30 JST
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: referenceUtc,
      })
    ).toBe(true)
  })

  it('falls back to stored open_now when periods are unavailable', () => {
    expect(
      evaluateOpenNow({
        openingHours: { open_now: true },
      })
    ).toBe(true)
    expect(
      evaluateOpenNow({
        openingHours: { open_now: false },
      })
    ).toBe(false)
  })

  it('uses UTC deterministically when periods exist but timezone metadata is unavailable', () => {
    const openingHours = {
      open_now: false,
      periods: [
        {
          open: { day: 1, time: '0900' },
          close: { day: 1, time: '1100' },
        },
      ],
    }

    const referenceUtc = new Date('2026-02-09T10:00:00.000Z') // Monday 10:00 UTC
    expect(
      evaluateOpenNow({
        openingHours,
        referenceTime: referenceUtc,
      })
    ).toBe(true)
  })

  it('returns null when schedule and fallback booleans are unavailable', () => {
    expect(
      evaluateOpenNow({
        openingHours: { weekday_text: ['Monday: Closed'] },
      })
    ).toBeNull()
  })
})
