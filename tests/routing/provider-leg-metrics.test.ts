import { describe, expect, it } from 'vitest'
import {
  buildComputedLegs,
  toTravelTimeBadges,
  validateAndNormalizeProviderLegMetrics,
} from '@/lib/routing/provider-leg-metrics'

describe('routing provider leg metric helpers', () => {
  it('validates and normalizes metrics into index map', () => {
    const result = validateAndNormalizeProviderLegMetrics(
      [
        { index: 1, distance_m: 240.4, duration_s: 91.7 },
        { index: 0, distance_m: 125.6, duration_s: 0 },
      ],
      2
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.normalizedByIndex.get(0)).toEqual({
      distance_m: 126,
      duration_s: 0,
    })
    expect(result.normalizedByIndex.get(1)).toEqual({
      distance_m: 240,
      duration_s: 92,
    })
  })

  it('rejects count mismatch', () => {
    const result = validateAndNormalizeProviderLegMetrics(
      [{ index: 0, distance_m: 100, duration_s: 50 }],
      2
    )

    expect(result).toEqual({
      ok: false,
      reason: 'leg_count_mismatch:2:1',
      receivedLegCount: 1,
    })
  })

  it('rejects duplicate and missing indices', () => {
    const result = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: 100, duration_s: 50 },
        { index: 0, distance_m: 120, duration_s: 60 },
      ],
      2
    )

    expect(result).toEqual({
      ok: false,
      reason: 'duplicate_index:0',
      receivedLegCount: 2,
    })
  })

  it('rejects out-of-range and non-integer indices', () => {
    const outOfRange = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: 100, duration_s: 50 },
        { index: 2, distance_m: 120, duration_s: 60 },
      ],
      2
    )
    expect(outOfRange).toEqual({
      ok: false,
      reason: 'index_out_of_range:2',
      receivedLegCount: 2,
    })

    const nonInteger = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: 100, duration_s: 50 },
        { index: 1.1, distance_m: 120, duration_s: 60 },
      ],
      2
    )
    expect(nonInteger).toEqual({
      ok: false,
      reason: 'invalid_index:1.1',
      receivedLegCount: 2,
    })
  })

  it('rejects non-finite and negative metrics', () => {
    const nonFinite = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: Number.POSITIVE_INFINITY, duration_s: 50 },
        { index: 1, distance_m: 120, duration_s: 60 },
      ],
      2
    )
    expect(nonFinite).toEqual({
      ok: false,
      reason: 'non_finite_metric:0',
      receivedLegCount: 2,
    })

    const negative = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: -10, duration_s: 50 },
        { index: 1, distance_m: 120, duration_s: 60 },
      ],
      2
    )
    expect(negative).toEqual({
      ok: false,
      reason: 'negative_metric:0',
      receivedLegCount: 2,
    })
  })

  it('builds computed legs from normalized metrics by draft index', () => {
    const normalized = validateAndNormalizeProviderLegMetrics(
      [
        { index: 0, distance_m: 125.6, duration_s: 0 },
        { index: 1, distance_m: 240.4, duration_s: 91.7 },
      ],
      2
    )

    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return

    const legs = buildComputedLegs({
      legDrafts: [
        {
          index: 0,
          from_item_id: 'item-1',
          to_item_id: 'item-2',
          from_place_id: 'place-1',
          to_place_id: 'place-2',
        },
        {
          index: 1,
          from_item_id: 'item-2',
          to_item_id: 'item-3',
          from_place_id: 'place-2',
          to_place_id: 'place-3',
        },
      ],
      normalizedByIndex: normalized.normalizedByIndex,
    })

    expect(legs).toEqual([
      {
        index: 0,
        from_item_id: 'item-1',
        to_item_id: 'item-2',
        from_place_id: 'place-1',
        to_place_id: 'place-2',
        distance_m: 126,
        duration_s: 0,
        travel_time_badge_minutes: 0,
        travel_time_badge_short: '0m',
        travel_time_badge_long: '0 min',
      },
      {
        index: 1,
        from_item_id: 'item-2',
        to_item_id: 'item-3',
        from_place_id: 'place-2',
        to_place_id: 'place-3',
        distance_m: 240,
        duration_s: 92,
        travel_time_badge_minutes: 2,
        travel_time_badge_short: '2m',
        travel_time_badge_long: '2 min',
      },
    ])
  })

  it('derives travel-time badges deterministically', () => {
    expect(toTravelTimeBadges(0)).toEqual({
      travel_time_badge_minutes: 0,
      travel_time_badge_short: '0m',
      travel_time_badge_long: '0 min',
    })
    expect(toTravelTimeBadges(15)).toEqual({
      travel_time_badge_minutes: 1,
      travel_time_badge_short: '1m',
      travel_time_badge_long: '1 min',
    })
    expect(toTravelTimeBadges(91)).toEqual({
      travel_time_badge_minutes: 2,
      travel_time_badge_short: '2m',
      travel_time_badge_long: '2 min',
    })
  })
})
