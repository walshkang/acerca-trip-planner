import { adminSupabase } from '@/lib/supabase/admin'

const MONITOR_THRESHOLD = 0.01
const BACKFILL_THRESHOLD = 0.05

export type OpenNowFallbackDecision =
  | 'no_action'
  | 'monitor'
  | 'backfill_candidate'

type OpenNowFilterMode = 'places' | 'list_items'

type RecordOpenNowUtcFallbackTelemetryInput = {
  mode: OpenNowFilterMode
  expected: boolean
  evaluatedCount: number
  utcFallbackCount: number
  listId?: string
  eventTime?: Date
}

type OpenNowTelemetryAggregateRow = {
  day: string
  mode: OpenNowFilterMode
  expected: boolean
  evaluated_count: number | string
  utc_fallback_count: number | string
  fallback_rate: number | string | null
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function classifyOpenNowFallbackRate(rate: number): OpenNowFallbackDecision {
  if (rate > BACKFILL_THRESHOLD) return 'backfill_candidate'
  if (rate >= MONITOR_THRESHOLD) return 'monitor'
  return 'no_action'
}

export async function recordOpenNowUtcFallbackTelemetry({
  mode,
  expected,
  evaluatedCount,
  utcFallbackCount,
  listId,
  eventTime = new Date(),
}: RecordOpenNowUtcFallbackTelemetryInput): Promise<void> {
  const normalizedEvaluated = normalizeCount(evaluatedCount)
  const normalizedFallback = Math.min(
    normalizeCount(utcFallbackCount),
    normalizedEvaluated
  )

  if (normalizedEvaluated === 0 || normalizedFallback === 0) return

  const day = eventTime.toISOString().slice(0, 10)
  let data: unknown = null
  let error: { message: string } | null = null
  try {
    const response = await adminSupabase.rpc('record_open_now_filter_telemetry', {
      p_day: day,
      p_mode: mode,
      p_expected: expected,
      p_evaluated_count: normalizedEvaluated,
      p_utc_fallback_count: normalizedFallback,
    })
    data = response.data
    error = response.error ? { message: response.error.message } : null
  } catch (caughtError: unknown) {
    error = {
      message:
        caughtError instanceof Error ? caughtError.message : 'Unknown telemetry error',
    }
  }

  if (error) {
    console.error('filters.open_now_utc_fallback_telemetry_error', {
      mode,
      listId,
      expected,
      day,
      evaluatedCount: normalizedEvaluated,
      utcFallbackCount: normalizedFallback,
      error: error.message,
    })
    return
  }

  const aggregate = Array.isArray(data)
    ? (data[0] as OpenNowTelemetryAggregateRow | undefined)
    : undefined

  const totalEvaluatedCount =
    parseNumeric(aggregate?.evaluated_count) ?? normalizedEvaluated
  const totalUtcFallbackCount =
    parseNumeric(aggregate?.utc_fallback_count) ?? normalizedFallback
  const fallbackRate =
    parseNumeric(aggregate?.fallback_rate) ??
    (totalEvaluatedCount > 0 ? totalUtcFallbackCount / totalEvaluatedCount : 0)
  const decision = classifyOpenNowFallbackRate(fallbackRate)

  console.info('filters.open_now_utc_fallback', {
    mode,
    listId,
    expected,
    day,
    evaluatedCount: normalizedEvaluated,
    utcFallbackCount: normalizedFallback,
    totalEvaluatedCount,
    totalUtcFallbackCount,
    fallbackRate,
    decision,
  })
}
