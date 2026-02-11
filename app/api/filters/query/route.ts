import { NextResponse } from 'next/server'
import {
  emptyCanonicalServerFilters,
  parseServerFilterPayload,
  type CanonicalServerFilters,
  type ServerFilterFieldErrors,
} from '@/lib/filters/schema'
import {
  evaluateOpenNowWithResolution,
  type OpenNowResolutionSource,
} from '@/lib/filters/open-now'
import { recordOpenNowUtcFallbackTelemetry } from '@/lib/server/filters/open-now-telemetry'
import { createClient } from '@/lib/supabase/server'

const PLACE_FIELDS =
  'id, name, address, category, energy, opening_hours, created_at, user_notes, user_tags'
const LIST_FIELDS =
  'id, name, description, is_default, created_at, start_date, end_date, timezone'
const LIST_ITEM_FIELDS =
  'id, list_id, place_id, created_at, scheduled_date, scheduled_start_time, scheduled_end_time, scheduled_order, completed_at, tags, place:places(id, name, address, category, energy, opening_hours, created_at, user_notes, user_tags)'
const TOP_LEVEL_FILTER_KEYS = [
  'category',
  'categories',
  'type',
  'types',
  'energy',
  'energies',
  'tags',
  'open_now',
  'within_list_id',
] as const
const OPEN_NOW_PREFILTER_LIMIT = 5000

type PlaceWithOpeningHours = {
  opening_hours?: unknown | null
}

type ListItemWithPlace = {
  place?: PlaceWithOpeningHours | null
}

type OpenNowFilterStats = {
  evaluatedCount: number
  utcFallbackCount: number
}

type OpenNowFilterResult<T> = {
  rows: T[]
  stats: OpenNowFilterStats
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseIntLike(
  rawValue: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const value =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string'
        ? Number.parseInt(rawValue, 10)
        : Number.NaN
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function buildTagOrFilter(tags: string[]): string | null {
  if (!tags.length) return null
  return tags.map((tag) => `tags.cs.{${tag}}`).join(',')
}

function invalidFilterResponse(
  message: string,
  fieldErrors: ServerFilterFieldErrors
) {
  return NextResponse.json(
    {
      code: 'invalid_filter_payload',
      message,
      fieldErrors,
      lastValidCanonicalFilters: emptyCanonicalServerFilters(),
    },
    { status: 400 }
  )
}

function extractTopLevelFilters(
  body: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of TOP_LEVEL_FILTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue
    payload[key] = body[key]
  }
  return payload
}

function parseRequestBody(input: unknown):
  | {
      ok: true
      rawFilters: unknown
      limit: number
      offset: number
    }
  | { ok: false; response: NextResponse } {
  if (!isRecord(input)) {
    return {
      ok: false,
      response: invalidFilterResponse('Body must be a JSON object', {
        payload: ['Body must be a JSON object'],
      }),
    }
  }

  const body = input as Record<string, unknown>
  const limit = parseIntLike(body.limit, 100, 1, 200)
  const offset = parseIntLike(body.offset, 0, 0, Number.MAX_SAFE_INTEGER)
  const rawFilters = Object.prototype.hasOwnProperty.call(body, 'filters')
    ? body.filters
    : extractTopLevelFilters(body)

  const listId = body.list_id
  if (listId == null) {
    return { ok: true, rawFilters, limit, offset }
  }

  if (typeof listId !== 'string') {
    return {
      ok: false,
      response: invalidFilterResponse('list_id must be a UUID string', {
        within_list_id: ['list_id must be a UUID string'],
      }),
    }
  }

  if (!isRecord(rawFilters)) {
    return { ok: true, rawFilters, limit, offset }
  }

  const currentWithin = rawFilters.within_list_id
  if (
    currentWithin != null &&
    typeof currentWithin === 'string' &&
    currentWithin.trim() !== '' &&
    currentWithin !== listId
  ) {
    return {
      ok: false,
      response: invalidFilterResponse(
        'list_id and filters.within_list_id must match',
        {
          within_list_id: ['list_id and filters.within_list_id must match'],
        }
      ),
    }
  }

  return {
    ok: true,
    rawFilters: { ...rawFilters, within_list_id: listId },
    limit,
    offset,
  }
}

function hasPlaceLevelFilters(filters: CanonicalServerFilters): boolean {
  return filters.category.length > 0 || filters.energy.length > 0
}

function createOpenNowFilterStats(): OpenNowFilterStats {
  return {
    evaluatedCount: 0,
    utcFallbackCount: 0,
  }
}

function evaluateOpenNowMatch(
  place: PlaceWithOpeningHours | null | undefined,
  expected: boolean,
  referenceTime: Date,
  fallbackTimezone: string | null
): { matches: boolean; resolutionSource: OpenNowResolutionSource } {
  const result = evaluateOpenNowWithResolution({
    openingHours: place?.opening_hours ?? null,
    referenceTime,
    fallbackTimezone,
  })
  return {
    matches: result.openNow === expected,
    resolutionSource: result.resolutionSource,
  }
}

function applyOpenNowToPlaces<T extends PlaceWithOpeningHours>(
  places: T[],
  filters: CanonicalServerFilters,
  referenceTime: Date
): OpenNowFilterResult<T> {
  if (filters.open_now === null) {
    return {
      rows: places,
      stats: createOpenNowFilterStats(),
    }
  }

  const expected = filters.open_now
  const filtered: T[] = []
  const stats = createOpenNowFilterStats()

  for (const place of places) {
    const result = evaluateOpenNowMatch(place, expected, referenceTime, null)
    stats.evaluatedCount += 1
    if (result.resolutionSource === 'utc_fallback') {
      stats.utcFallbackCount += 1
    }
    if (result.matches) {
      filtered.push(place)
    }
  }

  return { rows: filtered, stats }
}

function applyOpenNowToListItems<T extends ListItemWithPlace>(
  items: T[],
  filters: CanonicalServerFilters,
  referenceTime: Date,
  listTimezone: string | null
): OpenNowFilterResult<T> {
  if (filters.open_now === null) {
    return {
      rows: items,
      stats: createOpenNowFilterStats(),
    }
  }

  const expected = filters.open_now
  const filtered: T[] = []
  const stats = createOpenNowFilterStats()

  for (const item of items) {
    const result = evaluateOpenNowMatch(
      item.place ?? null,
      expected,
      referenceTime,
      listTimezone
    )
    stats.evaluatedCount += 1
    if (result.resolutionSource === 'utc_fallback') {
      stats.utcFallbackCount += 1
    }
    if (result.matches) {
      filtered.push(item)
    }
  }

  return { rows: filtered, stats }
}

async function resolvePlaceIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  filters: CanonicalServerFilters
): Promise<{ ids: string[] | null; error: string | null }> {
  if (!hasPlaceLevelFilters(filters)) {
    return { ids: null, error: null }
  }

  let query = supabase.from('places').select('id').eq('user_id', userId)
  if (filters.category.length > 0) {
    query = query.in('category', filters.category)
  }
  if (filters.energy.length > 0) {
    query = query.in('energy', filters.energy)
  }

  const { data, error } = await query
  if (error) {
    return { ids: null, error: error.message }
  }

  return {
    ids: (data ?? [])
      .map((row) => row.id)
      .filter((value): value is string => typeof value === 'string'),
    error: null,
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = (await request.json().catch(() => null)) as unknown
    const parsedBody = parseRequestBody(json)
    if (!parsedBody.ok) {
      return parsedBody.response
    }

    const parsedFilters = parseServerFilterPayload(parsedBody.rawFilters)
    if (!parsedFilters.ok) {
      return invalidFilterResponse(parsedFilters.message, parsedFilters.fieldErrors)
    }

    const filters = parsedFilters.canonical
    const { limit, offset } = parsedBody
    const referenceTime = new Date()

    if (filters.within_list_id) {
      const { data: list, error: listError } = await supabase
        .from('lists')
        .select(LIST_FIELDS)
        .eq('id', filters.within_list_id)
        .single()

      if (listError || !list) {
        if (listError?.code === 'PGRST116') {
          return NextResponse.json({ error: 'List not found' }, { status: 404 })
        }
        return NextResponse.json(
          { error: listError?.message || 'List not found' },
          { status: 404 }
        )
      }

      const { ids: placeIds, error: placeIdError } = await resolvePlaceIds(
        supabase,
        user.id,
        filters
      )
      if (placeIdError) {
        return NextResponse.json({ error: placeIdError }, { status: 500 })
      }

      if (placeIds && placeIds.length === 0) {
        return NextResponse.json({
          mode: 'list_items',
          list,
          canonicalFilters: filters,
          items: [],
          places: [],
        })
      }

      let query = supabase
        .from('list_items')
        .select(LIST_ITEM_FIELDS)
        .eq('list_id', filters.within_list_id)

      if (placeIds && placeIds.length > 0) {
        query = query.in('place_id', placeIds)
      }

      const tagOrFilter = buildTagOrFilter(filters.tags)
      if (tagOrFilter) {
        query = query.or(tagOrFilter)
      }

      const { data: items, error: itemsError } = await query
        .order('completed_at', { ascending: true, nullsFirst: true })
        .order('scheduled_date', { ascending: true, nullsFirst: true })
        .order('scheduled_order', { ascending: true })
        .order('created_at', { ascending: true })
        .range(
          filters.open_now === null ? offset : 0,
          filters.open_now === null
            ? offset + limit - 1
            : OPEN_NOW_PREFILTER_LIMIT - 1
        )

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }

      const filteredItemsResult = applyOpenNowToListItems(
        (items ?? []) as ListItemWithPlace[],
        filters,
        referenceTime,
        list.timezone ?? null
      )

      if (filters.open_now !== null) {
        await recordOpenNowUtcFallbackTelemetry({
          mode: 'list_items',
          listId: list.id,
          expected: filters.open_now,
          evaluatedCount: filteredItemsResult.stats.evaluatedCount,
          utcFallbackCount: filteredItemsResult.stats.utcFallbackCount,
        })
      }

      const pagedItems =
        filters.open_now === null
          ? filteredItemsResult.rows
          : filteredItemsResult.rows.slice(offset, offset + limit)

      return NextResponse.json({
        mode: 'list_items',
        list,
        canonicalFilters: filters,
        items: pagedItems,
        places: [],
      })
    }

    let query = supabase
      .from('places')
      .select(PLACE_FIELDS)
      .eq('user_id', user.id)

    if (filters.category.length > 0) {
      query = query.in('category', filters.category)
    }
    if (filters.energy.length > 0) {
      query = query.in('energy', filters.energy)
    }

    const { data: places, error: placesError } = await query
      .order('created_at', { ascending: true })
      .range(
        filters.open_now === null ? offset : 0,
        filters.open_now === null
          ? offset + limit - 1
          : OPEN_NOW_PREFILTER_LIMIT - 1
      )

    if (placesError) {
      return NextResponse.json({ error: placesError.message }, { status: 500 })
    }

    const filteredPlacesResult = applyOpenNowToPlaces(
      (places ?? []) as PlaceWithOpeningHours[],
      filters,
      referenceTime
    )

    if (filters.open_now !== null) {
      await recordOpenNowUtcFallbackTelemetry({
        mode: 'places',
        expected: filters.open_now,
        evaluatedCount: filteredPlacesResult.stats.evaluatedCount,
        utcFallbackCount: filteredPlacesResult.stats.utcFallbackCount,
      })
    }

    const pagedPlaces =
      filters.open_now === null
        ? filteredPlacesResult.rows
        : filteredPlacesResult.rows.slice(offset, offset + limit)

    return NextResponse.json({
      mode: 'places',
      list: null,
      canonicalFilters: filters,
      places: pagedPlaces,
      items: [],
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
