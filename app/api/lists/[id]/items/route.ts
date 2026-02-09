import { NextRequest, NextResponse } from 'next/server'
import {
  emptyCanonicalListFilters,
  parseListFilterPayload,
} from '@/lib/lists/filters'
import { scheduledStartTimeFromSlot } from '@/lib/lists/planner'
import { createClient } from '@/lib/supabase/server'
import { distinctTagsFromItems, normalizeTag, normalizeTagList } from '@/lib/lists/tags'

const LIST_FIELDS =
  'id, name, description, is_default, created_at, start_date, end_date, timezone'
const ITEM_FIELDS =
  'id, created_at, scheduled_date, scheduled_start_time, scheduled_end_time, scheduled_order, completed_at, tags, place:places(id, name, category, address, created_at, user_notes)'

const TYPE_TAG_BLOCKLIST = new Set([
  'food',
  'coffee',
  'drinks',
  'drink',
  'bar',
  'bars',
  'sights',
  'sight',
  'shop',
  'shopping',
  'activity',
  'activities',
])

function parseIntParam(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildTagOrFilter(tags: string[]): string | null {
  if (!tags.length) return null
  return tags.map((tag) => `tags.cs.{${tag}}`).join(',')
}

function collectParams(searchParams: URLSearchParams, keys: string[]): string[] {
  const out: string[] = []
  for (const key of keys) {
    for (const value of searchParams.getAll(key)) {
      out.push(value)
    }
  }
  return out
}

function parseFiltersFromSearchParams(searchParams: URLSearchParams) {
  const rawFilters = searchParams.get('filters')
  if (typeof rawFilters === 'string') {
    try {
      const parsedJson = JSON.parse(rawFilters)
      return parseListFilterPayload(parsedJson)
    } catch {
      return {
        ok: false as const,
        code: 'invalid_filter_payload' as const,
        message: 'filters must be valid JSON',
        fieldErrors: {
          payload: ['filters must be valid JSON'],
        },
      }
    }
  }

  const categories = collectParams(searchParams, [
    'categories',
    'category',
    'types',
    'type',
  ])
  const tags = collectParams(searchParams, ['tags', 'tag'])
  const scheduled_date =
    searchParams.get('scheduled_date') ?? searchParams.get('date')
  const slot = searchParams.get('slot')

  const hasFilterInput =
    categories.length > 0 ||
    tags.length > 0 ||
    typeof scheduled_date === 'string' ||
    typeof slot === 'string'

  if (!hasFilterInput) {
    return parseListFilterPayload(null)
  }

  const payload: Record<string, unknown> = {}
  if (categories.length > 0) payload.categories = categories
  if (tags.length > 0) payload.tags = tags
  if (typeof scheduled_date === 'string') payload.scheduled_date = scheduled_date
  if (typeof slot === 'string') payload.slot = slot

  return parseListFilterPayload(payload)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select(LIST_FIELDS)
      .eq('id', params.id)
      .single()

    if (listError) {
      if (listError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const parsedFilters = parseFiltersFromSearchParams(searchParams)
    if (!parsedFilters.ok) {
      return NextResponse.json(
        {
          code: parsedFilters.code,
          message: parsedFilters.message,
          fieldErrors: parsedFilters.fieldErrors,
          lastValidCanonicalFilters: emptyCanonicalListFilters(),
        },
        { status: 400 }
      )
    }

    const rawLimit = parseIntParam(searchParams.get('limit'), 100)
    const rawOffset = parseIntParam(searchParams.get('offset'), 0)
    const limit = Math.min(Math.max(rawLimit, 1), 200)
    const offset = Math.max(rawOffset, 0)

    let categoryPlaceIds: string[] | null = null
    if (parsedFilters.canonical.categories.length) {
      const { data: categoryPlaces, error: categoryPlacesError } = await supabase
        .from('places')
        .select('id')
        .eq('user_id', user.id)
        .in('category', parsedFilters.canonical.categories)

      if (categoryPlacesError) {
        return NextResponse.json(
          { error: categoryPlacesError.message },
          { status: 500 }
        )
      }

      categoryPlaceIds = (categoryPlaces ?? [])
        .map((row) => row.id)
        .filter((value): value is string => typeof value === 'string')

      if (!categoryPlaceIds.length) {
        return NextResponse.json({
          list,
          items: [],
          distinct_tags: [],
          canonicalFilters: parsedFilters.canonical,
        })
      }
    }

    let query = supabase
      .from('list_items')
      .select(ITEM_FIELDS)
      .eq('list_id', params.id)

    if (categoryPlaceIds?.length) {
      query = query.in('place_id', categoryPlaceIds)
    }

    if (parsedFilters.canonical.scheduled_date) {
      query = query.eq('scheduled_date', parsedFilters.canonical.scheduled_date)
    }

    if (parsedFilters.canonical.slot) {
      query = query.eq(
        'scheduled_start_time',
        scheduledStartTimeFromSlot(parsedFilters.canonical.slot)
      )
    }

    const tagOrFilter = buildTagOrFilter(parsedFilters.canonical.tags)
    if (tagOrFilter) {
      query = query.or(tagOrFilter)
    }

    const { data: items, error: itemsError } = await query
      .order('completed_at', { ascending: true, nullsFirst: true })
      .order('scheduled_date', { ascending: true, nullsFirst: true })
      .order('scheduled_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const resolvedItems = (items ?? []) as Array<{
      tags?: string[] | null
      place?: { category?: string | null } | null
      scheduled_date?: string | null
      scheduled_start_time?: string | null
    }>
    const distinctTags = distinctTagsFromItems(resolvedItems)

    return NextResponse.json({
      list,
      items: resolvedItems,
      distinct_tags: distinctTags,
      canonicalFilters: parsedFilters.canonical,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      place_id?: string
      tags?: unknown
    }

    const placeId = typeof body.place_id === 'string' ? body.place_id : null
    if (!placeId) {
      return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
    }

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', params.id)
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

    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id, enrichment_id')
      .eq('id', placeId)
      .eq('user_id', user.id)
      .single()

    if (placeError || !place) {
      if (placeError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: placeError?.message || 'Place not found' },
        { status: 404 }
      )
    }

    const hasTagsField = Object.prototype.hasOwnProperty.call(body, 'tags')
    const normalizedProvided = hasTagsField ? normalizeTagList(body.tags) : []
    if (hasTagsField && normalizedProvided === null) {
      return NextResponse.json(
        { error: 'tags must be a string or string[]' },
        { status: 400 }
      )
    }
    const providedTags = normalizedProvided ?? []

    let seedTags: string[] = []
    if (place.enrichment_id) {
      const { data: enrichment } = await supabase
        .from('enrichments')
        .select('normalized_data')
        .eq('id', place.enrichment_id)
        .single()

      const raw = enrichment?.normalized_data as
        | { tags?: unknown; category?: unknown }
        | null
        | undefined
      const normalizedFromEnrichment = normalizeTagList(raw?.tags)
      if (normalizedFromEnrichment?.length) {
        const normalizedCategory =
          typeof raw?.category === 'string' ? normalizeTag(raw.category) : null
        seedTags = normalizedFromEnrichment.filter((tag) => {
          if (TYPE_TAG_BLOCKLIST.has(tag)) return false
          if (normalizedCategory && tag === normalizedCategory) return false
          return true
        })
      }
    }

    const desiredTags =
      seedTags.length || providedTags.length
        ? (normalizeTagList([...seedTags, ...providedTags]) ?? [])
        : []

    const { data: existing, error: existingError } = await supabase
      .from('list_items')
      .select('id, list_id, place_id, tags')
      .eq('list_id', params.id)
      .eq('place_id', placeId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: existingError?.message || 'Failed to load list item' },
        { status: 500 }
      )
    }

    const existingTags = Array.isArray(existing?.tags) ? existing?.tags ?? [] : []
    const shouldUpdateTags =
      desiredTags.length > 0 && (hasTagsField || existingTags.length === 0)

    if (existing) {
      if (!shouldUpdateTags) {
        return NextResponse.json({ item: existing })
      }

      const { data: updated, error: updateError } = await supabase
        .from('list_items')
        .update({ tags: desiredTags })
        .eq('id', existing.id)
        .select('id, list_id, place_id, tags')
        .single()

      if (updateError || !updated) {
        return NextResponse.json(
          { error: updateError?.message || 'Failed to update list item tags' },
          { status: 500 }
        )
      }

      return NextResponse.json({ item: updated })
    }

    const insertPayload: {
      list_id: string
      place_id: string
      tags?: string[]
    } = {
      list_id: params.id,
      place_id: placeId,
    }
    if (desiredTags.length) {
      insertPayload.tags = desiredTags
    }

    const { data: item, error: itemError } = await supabase
      .from('list_items')
      .insert(insertPayload)
      .select('id, list_id, place_id, tags')
      .single()

    if (itemError || !item) {
      if (itemError?.code === '23505') {
        const { data: fallback, error: fallbackError } = await supabase
          .from('list_items')
          .select('id, list_id, place_id, tags')
          .eq('list_id', params.id)
          .eq('place_id', placeId)
          .single()

        if (fallbackError || !fallback) {
          return NextResponse.json(
            { error: fallbackError?.message || 'Failed to add list item' },
            { status: 500 }
          )
        }

        const fallbackTags = Array.isArray(fallback.tags)
          ? fallback.tags ?? []
          : []
        const shouldUpdateFallback =
          desiredTags.length > 0 && (hasTagsField || fallbackTags.length === 0)

        if (!shouldUpdateFallback) {
          return NextResponse.json({ item: fallback })
        }

        const { data: updated, error: updateError } = await supabase
          .from('list_items')
          .update({ tags: desiredTags })
          .eq('id', fallback.id)
          .select('id, list_id, place_id, tags')
          .single()

        if (updateError || !updated) {
          return NextResponse.json(
            { error: updateError?.message || 'Failed to update list item tags' },
            { status: 500 }
          )
        }

        return NextResponse.json({ item: updated })
      }

      return NextResponse.json(
        { error: itemError?.message || 'Failed to add list item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')
    if (!placeId) {
      return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
    }

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', params.id)
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

    const { error: deleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', params.id)
      .eq('place_id', placeId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
