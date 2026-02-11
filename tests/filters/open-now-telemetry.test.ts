import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  adminSupabase: {
    rpc: rpcMock,
  },
}))

import {
  classifyOpenNowFallbackRate,
  recordOpenNowUtcFallbackTelemetry,
} from '@/lib/server/filters/open-now-telemetry'

describe('open now telemetry', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('classifies fallback rate thresholds', () => {
    expect(classifyOpenNowFallbackRate(0)).toBe('no_action')
    expect(classifyOpenNowFallbackRate(0.009)).toBe('no_action')
    expect(classifyOpenNowFallbackRate(0.01)).toBe('monitor')
    expect(classifyOpenNowFallbackRate(0.05)).toBe('monitor')
    expect(classifyOpenNowFallbackRate(0.0501)).toBe('backfill_candidate')
  })

  it('skips sink writes when fallback count is zero', async () => {
    await recordOpenNowUtcFallbackTelemetry({
      mode: 'places',
      expected: true,
      evaluatedCount: 10,
      utcFallbackCount: 0,
      eventTime: new Date('2026-02-11T00:00:00.000Z'),
    })

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('writes telemetry and logs decision using aggregated counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    rpcMock.mockResolvedValue({
      data: [
        {
          day: '2026-02-11',
          mode: 'list_items',
          expected: true,
          evaluated_count: 200,
          utc_fallback_count: 12,
          fallback_rate: 0.06,
        },
      ],
      error: null,
    })

    await recordOpenNowUtcFallbackTelemetry({
      mode: 'list_items',
      expected: true,
      listId: 'list-1',
      evaluatedCount: 40,
      utcFallbackCount: 3,
      eventTime: new Date('2026-02-11T08:00:00.000Z'),
    })

    expect(rpcMock).toHaveBeenCalledWith('record_open_now_filter_telemetry', {
      p_day: '2026-02-11',
      p_mode: 'list_items',
      p_expected: true,
      p_evaluated_count: 40,
      p_utc_fallback_count: 3,
    })
    expect(infoSpy).toHaveBeenCalledWith(
      'filters.open_now_utc_fallback',
      expect.objectContaining({
        mode: 'list_items',
        listId: 'list-1',
        expected: true,
        day: '2026-02-11',
        totalEvaluatedCount: 200,
        totalUtcFallbackCount: 12,
        fallbackRate: 0.06,
        decision: 'backfill_candidate',
      })
    )
    infoSpy.mockRestore()
  })

  it('logs telemetry errors without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'rpc unavailable' },
    })

    await expect(
      recordOpenNowUtcFallbackTelemetry({
        mode: 'places',
        expected: false,
        evaluatedCount: 8,
        utcFallbackCount: 2,
        eventTime: new Date('2026-02-11T00:00:00.000Z'),
      })
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(
      'filters.open_now_utc_fallback_telemetry_error',
      expect.objectContaining({
        mode: 'places',
        expected: false,
        day: '2026-02-11',
        error: 'rpc unavailable',
      })
    )
    errorSpy.mockRestore()
  })
})
