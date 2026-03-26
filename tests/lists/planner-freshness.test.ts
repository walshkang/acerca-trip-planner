import { describe, expect, it } from 'vitest'
import { formatPlannerFreshnessLabel } from '@/lib/lists/planner-freshness'

describe('formatPlannerFreshnessLabel', () => {
  it('returns Just now under 60s', () => {
    const now = 1_700_000_000_000
    expect(formatPlannerFreshnessLabel(now, now - 30_000)).toBe('Just now')
    expect(formatPlannerFreshnessLabel(now, now - 59_000)).toBe('Just now')
  })

  it('returns minutes under 1h', () => {
    const now = 1_700_000_000_000
    expect(formatPlannerFreshnessLabel(now, now - 60_000)).toBe('1m ago')
    expect(formatPlannerFreshnessLabel(now, now - 119_000)).toBe('1m ago')
    expect(formatPlannerFreshnessLabel(now, now - 120_000)).toBe('2m ago')
  })

  it('returns hours at 1h+', () => {
    const now = 1_700_000_000_000
    expect(formatPlannerFreshnessLabel(now, now - 3600_000)).toBe('1h ago')
    expect(formatPlannerFreshnessLabel(now, now - 7200_000)).toBe('2h ago')
  })
})
