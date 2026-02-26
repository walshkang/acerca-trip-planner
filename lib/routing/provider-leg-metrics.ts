import type {
  RoutingComputedLeg,
  RoutingLegDraft,
  RoutingProviderLegMetric,
} from '@/lib/routing/contract'

type NormalizedProviderLegMetric = {
  distance_m: number
  duration_s: number
}

export type ValidateAndNormalizeProviderLegMetricsResult =
  | {
      ok: true
      normalizedByIndex: Map<number, NormalizedProviderLegMetric>
    }
  | {
      ok: false
      reason: string
      receivedLegCount: number
    }

export type TravelTimeBadges = Pick<
  RoutingComputedLeg,
  | 'travel_time_badge_minutes'
  | 'travel_time_badge_short'
  | 'travel_time_badge_long'
>

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeNonNegativeInteger(value: number): number {
  return Math.max(0, Math.round(value))
}

export function toTravelTimeBadges(durationSeconds: number): TravelTimeBadges {
  if (durationSeconds === 0) {
    return {
      travel_time_badge_minutes: 0,
      travel_time_badge_short: '0m',
      travel_time_badge_long: '0 min',
    }
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60))
  return {
    travel_time_badge_minutes: minutes,
    travel_time_badge_short: `${minutes}m`,
    travel_time_badge_long: `${minutes} min`,
  }
}

export function validateAndNormalizeProviderLegMetrics(
  legMetrics: RoutingProviderLegMetric[],
  expectedLegCount: number
): ValidateAndNormalizeProviderLegMetricsResult {
  const receivedLegCount = legMetrics.length
  if (receivedLegCount !== expectedLegCount) {
    return {
      ok: false,
      reason: `leg_count_mismatch:${expectedLegCount}:${receivedLegCount}`,
      receivedLegCount,
    }
  }

  const seenIndices = new Set<number>()
  const normalizedByIndex = new Map<number, NormalizedProviderLegMetric>()

  for (const leg of legMetrics) {
    if (!Number.isInteger(leg.index)) {
      return {
        ok: false,
        reason: `invalid_index:${leg.index}`,
        receivedLegCount,
      }
    }

    if (leg.index < 0 || leg.index >= expectedLegCount) {
      return {
        ok: false,
        reason: `index_out_of_range:${leg.index}`,
        receivedLegCount,
      }
    }

    if (seenIndices.has(leg.index)) {
      return {
        ok: false,
        reason: `duplicate_index:${leg.index}`,
        receivedLegCount,
      }
    }

    if (!isFiniteNumber(leg.distance_m) || !isFiniteNumber(leg.duration_s)) {
      return {
        ok: false,
        reason: `non_finite_metric:${leg.index}`,
        receivedLegCount,
      }
    }

    if (leg.distance_m < 0 || leg.duration_s < 0) {
      return {
        ok: false,
        reason: `negative_metric:${leg.index}`,
        receivedLegCount,
      }
    }

    seenIndices.add(leg.index)
    normalizedByIndex.set(leg.index, {
      distance_m: normalizeNonNegativeInteger(leg.distance_m),
      duration_s: normalizeNonNegativeInteger(leg.duration_s),
    })
  }

  for (let index = 0; index < expectedLegCount; index += 1) {
    if (!seenIndices.has(index)) {
      return {
        ok: false,
        reason: `missing_index:${index}`,
        receivedLegCount,
      }
    }
  }

  return {
    ok: true,
    normalizedByIndex,
  }
}

export function buildComputedLegs(args: {
  legDrafts: RoutingLegDraft[]
  normalizedByIndex: Map<number, NormalizedProviderLegMetric>
}): RoutingComputedLeg[] {
  const legs: RoutingComputedLeg[] = []
  for (const draft of args.legDrafts) {
    const metrics = args.normalizedByIndex.get(draft.index)
    if (!metrics) {
      throw new Error(`Missing normalized metric for leg index ${draft.index}`)
    }

    legs.push({
      ...draft,
      distance_m: metrics.distance_m,
      duration_s: metrics.duration_s,
      ...toTravelTimeBadges(metrics.duration_s),
    })
  }
  return legs
}
