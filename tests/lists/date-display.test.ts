import { describe, expect, it } from 'vitest'
import {
  daysBetweenInclusive,
  formatDateRange,
  friendlyTimezoneName,
} from '@/lib/lists/date-display'

describe('date-display', () => {
  describe('formatDateRange', () => {
    it('formats same-year range with year on the end only', () => {
      expect(formatDateRange('2026-02-22', '2026-03-01')).toBe('Feb 22 – Mar 1, 2026')
    })

    it('formats cross-year range with full dates', () => {
      expect(formatDateRange('2025-12-30', '2026-01-02')).toBe(
        'Dec 30, 2025 – Jan 2, 2026'
      )
    })

    it('falls back when dates are invalid', () => {
      expect(formatDateRange('bad', '2026-01-01')).toBe('bad – 2026-01-01')
    })
  })

  describe('daysBetweenInclusive', () => {
    it('delegates to planner inclusive count', () => {
      expect(daysBetweenInclusive('2026-02-22', '2026-03-01')).toBe(8)
      expect(daysBetweenInclusive('2026-02-22', '2026-02-22')).toBe(1)
      expect(daysBetweenInclusive('2026-03-01', '2026-02-22')).toBeNull()
    })
  })

  describe('friendlyTimezoneName', () => {
    it('resolves a common IANA zone to a generic label', () => {
      const label = friendlyTimezoneName('America/New_York')
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toBe('America/New_York')
    })

    it('returns raw string for invalid timezone', () => {
      expect(friendlyTimezoneName('Not/A_Zone_123')).toBe('Not/A_Zone_123')
    })

    it('returns empty for empty input', () => {
      expect(friendlyTimezoneName('')).toBe('')
    })
  })
})
