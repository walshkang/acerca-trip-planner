import { describe, expect, it } from 'vitest'
import {
  computeThreeDayWindow,
  initialTwoWeekMonday,
  shiftThreeDayWindow,
  shiftTwoWeekMonday,
  twoWeekShowsNavigation,
  twoWeekWindowMondays,
} from '@/lib/lists/calendar-view-window'

describe('calendar view window', () => {
  describe('computeThreeDayWindow', () => {
    it('uses full trip when shorter than 3 days', () => {
      expect(computeThreeDayWindow('2026-02-10', '2026-02-11', '2026-02-10', 2)).toEqual({
        windowStart: '2026-02-10',
        dayCount: 2,
        canShift: false,
      })
    })

    it('anchors to last valid start when anchor is trip end', () => {
      const r = computeThreeDayWindow('2026-02-10', '2026-02-14', '2026-02-14', 5)
      expect(r.dayCount).toBe(3)
      expect(r.canShift).toBe(true)
      expect(r.windowStart).toBe('2026-02-12')
    })

    it('uses largest W <= anchor for mid trip', () => {
      const r = computeThreeDayWindow('2026-02-10', '2026-02-16', '2026-02-12', 7)
      expect(r.windowStart).toBe('2026-02-12')
    })
  })

  describe('shiftThreeDayWindow', () => {
    it('steps by one day and clamps', () => {
      expect(
        shiftThreeDayWindow('2026-02-10', '2026-02-16', '2026-02-10', 'next', 7)
      ).toBe('2026-02-11')
      expect(
        shiftThreeDayWindow('2026-02-10', '2026-02-16', '2026-02-10', 'prev', 7)
      ).toBe('2026-02-10')
      expect(
        shiftThreeDayWindow('2026-02-10', '2026-02-16', '2026-02-14', 'next', 7)
      ).toBe('2026-02-14')
    })

    it('does not shift when trip shorter than 3 days', () => {
      expect(
        shiftThreeDayWindow('2026-02-10', '2026-02-11', '2026-02-10', 'next', 2)
      ).toBe('2026-02-10')
    })
  })

  describe('twoWeekWindowMondays', () => {
    it('returns single monday when trip fits in two rows or fewer', () => {
      const m = twoWeekWindowMondays('2026-02-16', '2026-02-22')
      expect(m).toEqual(['2026-02-16'])
    })

    it('returns two starts when calendar spans three week rows', () => {
      const m = twoWeekWindowMondays('2026-02-18', '2026-03-04')
      expect(m).toEqual(['2026-02-16', '2026-02-23'])
    })
  })

  it('twoWeekShowsNavigation matches row count', () => {
    expect(twoWeekShowsNavigation('2026-02-16', '2026-02-22')).toBe(false)
    expect(twoWeekShowsNavigation('2026-02-18', '2026-03-04')).toBe(true)
  })

  it('initialTwoWeekMonday picks containing block', () => {
    expect(initialTwoWeekMonday('2026-02-18', '2026-03-04', '2026-02-19')).toBe('2026-02-16')
    expect(initialTwoWeekMonday('2026-02-18', '2026-03-04', '2026-03-01')).toBe('2026-02-23')
  })

  it('shiftTwoWeekMonday moves between allowed mondays', () => {
    const mondays = ['2026-02-16', '2026-02-23']
    expect(shiftTwoWeekMonday('2026-02-16', 'next', mondays)).toBe('2026-02-23')
    expect(shiftTwoWeekMonday('2026-02-23', 'prev', mondays)).toBe('2026-02-16')
    expect(shiftTwoWeekMonday('2026-02-16', 'prev', mondays)).toBe('2026-02-16')
  })
})
