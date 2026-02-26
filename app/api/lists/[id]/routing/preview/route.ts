import { NextResponse } from 'next/server'
import type { CategoryEnum } from '@/lib/types/enums'
import type {
  CanonicalRoutingPreviewRequest,
  RoutingComputedLeg,
  RoutingLegDraft,
  RoutingProviderKind,
  RoutingProviderLegMetric,
  RoutingPreviewErrorPayload,
  RoutingPreviewListContext,
} from '@/lib/routing/contract'
import { parseRoutingPreviewRequest } from '@/lib/routing/contract'
import {
  buildRoutingSequence,
  type RoutingSequenceInputRow,
} from '@/lib/routing/sequence'
import { getRoutingPreviewProvider } from '@/lib/routing/provider'
import { createClient } from '@/lib/supabase/server'

const LIST_FIELDS = 'id, name, start_date, end_date, timezone'
const JOINED_ITEM_FIELDS =
  'id, place_id, created_at, scheduled_date, scheduled_start_time, scheduled_order, place:places_view(id, name, category, lat, lng)'
const FALLBACK_ITEM_FIELDS =
  'id, place_id, created_at, scheduled_date, scheduled_start_time, scheduled_order'
const PLACE_FIELDS = 'id, name, category, lat, lng'
const INVALID_PROVIDER_PAYLOAD_MESSAGE =
  'Routing provider returned invalid leg metrics.'

type PostgrestLikeError = {
  code?: string | null
  message?: string | null
} | null

type ListRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  timezone: string | null
}

type JoinedPlaceRow = {
  id: string | null
  name: string | null
  category: CategoryEnum | null
  lat: number | null
  lng: number | null
}

type JoinedItemRow = {
  id: string
  place_id: string
  created_at: string
  scheduled_date: string
  scheduled_start_time: string | null
  scheduled_order: number | null
  place: JoinedPlaceRow | null
}

type FallbackItemRow = {
  id: string
  place_id: string
  created_at: string
  scheduled_date: string
  scheduled_start_time: string | null
  scheduled_order: number | null
}

type PlaceViewRow = {
  id: string | null
  name: string | null
  category: CategoryEnum | null
  lat: number | null
  lng: number | null
}

type NormalizedLegMetric = {
  distance_m: number
  duration_s: number
}

function toErrorResponse(
  status: number,
  payload: RoutingPreviewErrorPayload
): NextResponse<RoutingPreviewErrorPayload> {
  return NextResponse.json(payload, { status })
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeNonNegativeInteger(value: number): number {
  return Math.max(0, Math.round(value))
}

function isDateOutsideRange(
  date: string,
  start: string | null,
  end: string | null
): boolean {
  if (start && date < start) return true
  if (end && date > end) return true
  return false
}

function shouldFallbackToTwoStep(error: PostgrestLikeError): boolean {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  if (!message.includes('places_view')) return false
  return (
    message.includes('relationship') ||
    message.includes('embed') ||
    message.includes('foreign key') ||
    message.includes('could not find')
  )
}

function toListContext(list: ListRow): RoutingPreviewListContext {
  return {
    id: list.id,
    name: list.name,
    timezone: list.timezone,
    start_date: list.start_date,
    end_date: list.end_date,
  }
}

function normalizeJoinedRows(rows: JoinedItemRow[]): RoutingSequenceInputRow[] {
  return rows.map((row) => ({
    item_id: row.id,
    place_id: row.place_id,
    place_name: row.place?.name ?? null,
    category: row.place?.category ?? null,
    scheduled_date: row.scheduled_date,
    scheduled_start_time: row.scheduled_start_time,
    scheduled_order: row.scheduled_order,
    created_at: row.created_at,
    lat: row.place?.lat ?? null,
    lng: row.place?.lng ?? null,
  }))
}

function normalizeFallbackRows(
  items: FallbackItemRow[],
  places: PlaceViewRow[]
): RoutingSequenceInputRow[] {
  const placeById = new Map<string, PlaceViewRow>()
  for (const place of places) {
    if (!place.id) continue
    placeById.set(place.id, place)
  }

  return items.map((row) => {
    const place = placeById.get(row.place_id) ?? null
    return {
      item_id: row.id,
      place_id: row.place_id,
      place_name: place?.name ?? null,
      category: place?.category ?? null,
      scheduled_date: row.scheduled_date,
      scheduled_start_time: row.scheduled_start_time,
      scheduled_order: row.scheduled_order,
      created_at: row.created_at,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
    }
  })
}

async function fetchRowsWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  date: string
): Promise<{ rows: RoutingSequenceInputRow[]; error: PostgrestLikeError }> {
  const joinedResult = await supabase
    .from('list_items')
    .select(JOINED_ITEM_FIELDS)
    .eq('list_id', listId)
    .eq('scheduled_date', date)
    .is('completed_at', null)

  const joinedData = (joinedResult.data ?? []) as JoinedItemRow[]
  const joinedError = joinedResult.error

  if (!joinedError) {
    return {
      rows: normalizeJoinedRows(joinedData),
      error: null,
    }
  }

  if (!shouldFallbackToTwoStep(joinedError)) {
    return {
      rows: [],
      error: joinedError,
    }
  }

  const itemResult = await supabase
    .from('list_items')
    .select(FALLBACK_ITEM_FIELDS)
    .eq('list_id', listId)
    .eq('scheduled_date', date)
    .is('completed_at', null)

  const itemData = (itemResult.data ?? []) as FallbackItemRow[]
  if (itemResult.error) {
    return {
      rows: [],
      error: itemResult.error,
    }
  }

  const placeIds = Array.from(new Set(itemData.map((row) => row.place_id)))
  if (!placeIds.length) {
    return { rows: [], error: null }
  }

  const placeResult = await supabase
    .from('places_view')
    .select(PLACE_FIELDS)
    .in('id', placeIds)

  if (placeResult.error) {
    return {
      rows: [],
      error: placeResult.error,
    }
  }

  return {
    rows: normalizeFallbackRows(itemData, (placeResult.data ?? []) as PlaceViewRow[]),
    error: null,
  }
}

function buildSummary(args: {
  totalItems: number
  routeableItems: number
  unroutableItems: number
  legCount: number
  totalDistanceMeters?: number | null
  totalDurationSeconds?: number | null
}) {
  return {
    total_items: args.totalItems,
    routeable_items: args.routeableItems,
    unroutable_items: args.unroutableItems,
    leg_count: args.legCount,
    total_distance_m: args.totalDistanceMeters ?? null,
    total_duration_s: args.totalDurationSeconds ?? null,
  }
}

function toTravelTimeBadges(durationSeconds: number) {
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

function validateProviderLegMetrics(
  legMetrics: RoutingProviderLegMetric[],
  expectedLegCount: number
):
  | {
      ok: true
      normalizedByIndex: Map<number, NormalizedLegMetric>
    }
  | {
      ok: false
      reason: string
      receivedLegCount: number
    } {
  const receivedLegCount = legMetrics.length
  if (receivedLegCount !== expectedLegCount) {
    return {
      ok: false,
      reason: `leg_count_mismatch:${expectedLegCount}:${receivedLegCount}`,
      receivedLegCount,
    }
  }

  const seenIndices = new Set<number>()
  const normalizedByIndex = new Map<number, NormalizedLegMetric>()

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

function buildComputedLegs(args: {
  legDrafts: RoutingLegDraft[]
  normalizedByIndex: Map<number, NormalizedLegMetric>
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

function logInvalidProviderMetrics(args: {
  provider: RoutingProviderKind
  listId: string
  canonical: CanonicalRoutingPreviewRequest
  expectedLegCount: number
  receivedLegCount: number
  reason: string
}) {
  console.error({
    event: 'routing_provider_leg_metrics_invalid',
    provider: args.provider,
    list_id: args.listId,
    date: args.canonical.date,
    expected_leg_count: args.expectedLegCount,
    received_leg_count: args.receivedLegCount,
    reason: args.reason,
  })
}

function insufficientResponse(args: {
  canonical: CanonicalRoutingPreviewRequest
  list: RoutingPreviewListContext
  rows: ReturnType<typeof buildRoutingSequence>
}) {
  return NextResponse.json({
    status: 'insufficient_items' as const,
    canonicalRequest: args.canonical,
    list: args.list,
    sequence: args.rows.sequence,
    unroutableItems: args.rows.unroutableItems,
    legs: [],
    summary: buildSummary({
      totalItems: args.rows.sequence.length,
      routeableItems: args.rows.routeableSequence.length,
      unroutableItems: args.rows.unroutableItems.length,
      legCount: 0,
    }),
  })
}

function providerUnavailableResponse(args: {
  canonical: CanonicalRoutingPreviewRequest
  list: RoutingPreviewListContext
  rows: ReturnType<typeof buildRoutingSequence>
  message?: string
}) {
  return NextResponse.json(
    {
      code: 'routing_provider_unavailable' as const,
      status: 'provider_unavailable' as const,
      message: args.message ?? 'Routing provider integration is not implemented yet.',
      canonicalRequest: args.canonical,
      list: args.list,
      sequence: args.rows.sequence,
      unroutableItems: args.rows.unroutableItems,
      legs: args.rows.legs,
      summary: buildSummary({
        totalItems: args.rows.sequence.length,
        routeableItems: args.rows.routeableSequence.length,
        unroutableItems: args.rows.unroutableItems.length,
        legCount: args.rows.legs.length,
      }),
    },
    { status: 501 }
  )
}

function providerSuccessResponse(args: {
  canonical: CanonicalRoutingPreviewRequest
  list: RoutingPreviewListContext
  rows: ReturnType<typeof buildRoutingSequence>
  provider: RoutingProviderKind
  legs: RoutingComputedLeg[]
}) {
  const totals = args.legs.reduce(
    (acc, leg) => ({
      totalDistanceMeters: acc.totalDistanceMeters + leg.distance_m,
      totalDurationSeconds: acc.totalDurationSeconds + leg.duration_s,
    }),
    {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
    }
  )

  return NextResponse.json({
    status: 'ok' as const,
    provider: args.provider,
    canonicalRequest: args.canonical,
    list: args.list,
    sequence: args.rows.sequence,
    unroutableItems: args.rows.unroutableItems,
    legs: args.legs,
    summary: buildSummary({
      totalItems: args.rows.sequence.length,
      routeableItems: args.rows.routeableSequence.length,
      unroutableItems: args.rows.unroutableItems.length,
      legCount: args.legs.length,
      totalDistanceMeters: totals.totalDistanceMeters,
      totalDurationSeconds: totals.totalDurationSeconds,
    }),
  })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return toErrorResponse(401, {
        code: 'unauthorized',
        message: 'Unauthorized',
      })
    }

    const body = (await request.json().catch(() => null)) as unknown
    const parsed = parseRoutingPreviewRequest(body)
    if (!parsed.ok) {
      return toErrorResponse(400, {
        code: 'invalid_routing_payload',
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
        lastValidCanonicalRequest: null,
      })
    }

    const canonical = parsed.canonical

    const listResult = await supabase
      .from('lists')
      .select(LIST_FIELDS)
      .eq('id', params.id)
      .single()

    if (listResult.error || !listResult.data) {
      if (listResult.error?.code === 'PGRST116') {
        return toErrorResponse(404, {
          code: 'not_found',
          message: 'List not found',
          lastValidCanonicalRequest: canonical,
        })
      }
      return toErrorResponse(500, {
        code: 'internal_error',
        message: listResult.error?.message ?? 'Failed to load list',
        lastValidCanonicalRequest: canonical,
      })
    }

    const list = listResult.data as ListRow
    if (isDateOutsideRange(canonical.date, list.start_date, list.end_date)) {
      return toErrorResponse(400, {
        code: 'date_outside_trip_range',
        message: 'date must be within list trip bounds',
        lastValidCanonicalRequest: canonical,
      })
    }

    const rowResult = await fetchRowsWithFallback(supabase, params.id, canonical.date)
    if (rowResult.error) {
      return toErrorResponse(500, {
        code: 'internal_error',
        message: rowResult.error.message ?? 'Failed to load list items',
        lastValidCanonicalRequest: canonical,
      })
    }

    const built = buildRoutingSequence(rowResult.rows)
    const listContext = toListContext(list)

    if (built.routeableSequence.length < 2) {
      return insufficientResponse({
        canonical,
        list: listContext,
        rows: built,
      })
    }

    const provider = getRoutingPreviewProvider()
    const providerResult = await provider.preview({
      canonicalRequest: canonical,
      list: listContext,
      sequence: built.sequence,
      routeableSequence: built.routeableSequence,
      legDrafts: built.legs,
    })

    if (providerResult.ok) {
      const validated = validateProviderLegMetrics(
        providerResult.legs,
        built.legs.length
      )

      if (!validated.ok) {
        logInvalidProviderMetrics({
          provider: providerResult.provider,
          listId: params.id,
          canonical,
          expectedLegCount: built.legs.length,
          receivedLegCount: validated.receivedLegCount,
          reason: validated.reason,
        })

        return toErrorResponse(500, {
          code: 'internal_error',
          message: INVALID_PROVIDER_PAYLOAD_MESSAGE,
          lastValidCanonicalRequest: canonical,
        })
      }

      return providerSuccessResponse({
        canonical,
        list: listContext,
        rows: built,
        provider: providerResult.provider,
        legs: buildComputedLegs({
          legDrafts: built.legs,
          normalizedByIndex: validated.normalizedByIndex,
        }),
      })
    }

    if (providerResult.code === 'provider_unavailable') {
      return providerUnavailableResponse({
        canonical,
        list: listContext,
        rows: built,
        message: providerResult.message,
      })
    }

    return toErrorResponse(500, {
      code: 'internal_error',
      message: providerResult.message,
      lastValidCanonicalRequest: canonical,
    })
  } catch (error: unknown) {
    return toErrorResponse(500, {
      code: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
