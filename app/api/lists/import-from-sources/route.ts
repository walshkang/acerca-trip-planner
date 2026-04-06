import { NextRequest, NextResponse } from 'next/server'
import { normalizeTagList } from '@/lib/lists/tags'
import type { ImportFromSourcesResponse } from '@/lib/social/sources-export-payload'
import { createClient } from '@/lib/supabase/server'

export type { ImportFromSourcesResponse } from '@/lib/social/sources-export-payload'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

const LIST_FIELDS = 'id, name, user_id'

type ImportBody = {
  mode?: unknown
  new_list_name?: unknown
  target_list_id?: unknown
  items?: unknown
}

type ImportItem = {
  place_id: string
  day_index?: number
  tags?: string[]
}

function normalizeDayIndex(v: unknown): number | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.trunc(v)
}

function parseItems(raw: unknown): { ok: true; items: ImportItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'items must be an array' }
  }
  const items: ImportItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, error: 'each item must be an object' }
    }
    const o = entry as Record<string, unknown>
    const place_id = typeof o.place_id === 'string' ? o.place_id : null
    if (!place_id || !isUuid(place_id)) {
      return { ok: false, error: 'each item.place_id must be a valid UUID' }
    }
    const dayRaw = o.day_index
    if (dayRaw !== undefined && (typeof dayRaw !== 'number' || !Number.isFinite(dayRaw))) {
      return { ok: false, error: 'item.day_index must be a finite number when set' }
    }
    const day_index = normalizeDayIndex(dayRaw)

    const hasTags = Object.prototype.hasOwnProperty.call(o, 'tags')
    let tags: string[] | undefined
    if (hasTags) {
      const normalized = normalizeTagList(o.tags)
      if (normalized === null) {
        return { ok: false, error: 'item.tags must be a string or string[]' }
      }
      tags = normalized
    }

    const item: ImportItem = { place_id }
    if (day_index !== undefined) item.day_index = day_index
    if (tags !== undefined) item.tags = tags
    items.push(item)
  }
  return { ok: true, items }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as ImportBody
    const mode = body.mode === 'new' || body.mode === 'existing' ? body.mode : null
    if (!mode) {
      return NextResponse.json({ error: 'mode must be "new" or "existing"' }, { status: 400 })
    }

    const parsedItems = parseItems(body.items)
    if (!parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 })
    }
    const { items } = parsedItems

    let listId: string
    let listName: string

    if (mode === 'new') {
      const rawName = typeof body.new_list_name === 'string' ? body.new_list_name.trim() : ''
      if (!rawName) {
        return NextResponse.json(
          { error: 'new_list_name is required when mode is "new"' },
          { status: 400 }
        )
      }

      const { data: created, error: insertListError } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: rawName,
          is_default: false,
        })
        .select('id, name')
        .single()

      if (insertListError || !created) {
        return NextResponse.json(
          { error: insertListError?.message || 'Failed to create list' },
          { status: 500 }
        )
      }
      listId = created.id
      listName = created.name
    } else {
      const tid =
        typeof body.target_list_id === 'string' && isUuid(body.target_list_id)
          ? body.target_list_id
          : null
      if (!tid) {
        return NextResponse.json(
          { error: 'target_list_id must be a valid UUID when mode is "existing"' },
          { status: 400 }
        )
      }

      const { data: existingList, error: listError } = await supabase
        .from('lists')
        .select(LIST_FIELDS)
        .eq('id', tid)
        .single()

      if (listError) {
        const status = listError.code === 'PGRST116' ? 404 : 500
        const msg = listError.code === 'PGRST116' ? 'List not found' : listError.message
        return NextResponse.json({ error: msg }, { status })
      }
      if (!existingList) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }

      if (existingList.user_id !== user.id) {
        // Do not leak existence of other users' lists
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }

      listId = existingList.id
      listName = existingList.name
    }

    const duplicate_items: ImportFromSourcesResponse['duplicate_items'] = []
    let inserted_count = 0

    if (items.length === 0) {
      const payload: ImportFromSourcesResponse = {
        list_id: listId,
        list_name: listName,
        inserted_count: 0,
        duplicate_items: [],
      }
      return NextResponse.json(payload)
    }

    const placeIds = [...new Set(items.map((i) => i.place_id))]

    const { data: placeRows, error: placesError } = await supabase
      .from('places')
      .select('id, name')
      .eq('user_id', user.id)
      .in('id', placeIds)

    if (placesError) {
      return NextResponse.json({ error: placesError.message }, { status: 500 })
    }

    const placeMap = new Map((placeRows ?? []).map((p) => [p.id, p.name]))
    for (const pid of placeIds) {
      if (!placeMap.has(pid)) {
        return NextResponse.json(
          { error: 'One or more places were not found for this account' },
          { status: 400 }
        )
      }
    }

    const { data: existingItems, error: existingErr } = await supabase
      .from('list_items')
      .select('place_id, day_index')
      .eq('list_id', listId)
      .in('place_id', placeIds)

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 })
    }

    const existingByPlace = new Map<string, number | null>(
      (existingItems ?? []).map((row) => [row.place_id, row.day_index])
    )

    for (const item of items) {
      const place_name = placeMap.get(item.place_id) ?? 'Unknown place'
      if (existingByPlace.has(item.place_id)) {
        const existing_day_index = existingByPlace.get(item.place_id) ?? null
        duplicate_items.push({
          place_id: item.place_id,
          place_name,
          existing_day_index,
          requested_day_index: item.day_index,
        })
        continue
      }

      const tags = normalizeTagList(item.tags ?? []) ?? []
      const insertPayload: {
        list_id: string
        place_id: string
        day_index?: number | null
        tags: string[]
      } = {
        list_id: listId,
        place_id: item.place_id,
        tags,
      }
      if (item.day_index !== undefined) {
        insertPayload.day_index = item.day_index
      } else {
        insertPayload.day_index = null
      }

      const { error: insErr } = await supabase.from('list_items').insert(insertPayload)

      if (insErr) {
        if (insErr.code === '23505') {
          const { data: row } = await supabase
            .from('list_items')
            .select('day_index')
            .eq('list_id', listId)
            .eq('place_id', item.place_id)
            .maybeSingle()
          const existing_day_index = row?.day_index ?? null
          duplicate_items.push({
            place_id: item.place_id,
            place_name,
            existing_day_index,
            requested_day_index: item.day_index,
          })
          existingByPlace.set(item.place_id, existing_day_index)
          continue
        }
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }

      inserted_count += 1
      existingByPlace.set(item.place_id, insertPayload.day_index ?? null)
    }

    const payload: ImportFromSourcesResponse = {
      list_id: listId,
      list_name: listName,
      inserted_count,
      duplicate_items,
    }
    return NextResponse.json(payload)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
