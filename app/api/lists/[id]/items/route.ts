import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { distinctTagsFromItems } from '@/lib/lists/tags'

const LIST_FIELDS =
  'id, name, description, is_default, created_at, start_date, end_date, timezone'
const ITEM_FIELDS =
  'id, created_at, scheduled_date, scheduled_start_time, scheduled_end_time, scheduled_order, completed_at, tags, place:places(id, name, category, address, created_at, user_notes, user_tags)'

function parseIntParam(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
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
    const rawLimit = parseIntParam(searchParams.get('limit'), 100)
    const rawOffset = parseIntParam(searchParams.get('offset'), 0)
    const limit = Math.min(Math.max(rawLimit, 1), 200)
    const offset = Math.max(rawOffset, 0)

    const { data: items, error: itemsError } = await supabase
      .from('list_items')
      .select(ITEM_FIELDS)
      .eq('list_id', params.id)
      .order('completed_at', { ascending: true, nullsFirst: true })
      .order('scheduled_date', { ascending: true, nullsFirst: true })
      .order('scheduled_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const resolvedItems = (items ?? []) as Array<{ tags?: string[] | null }>
    const distinctTags = distinctTagsFromItems(resolvedItems)

    return NextResponse.json({
      list,
      items: resolvedItems,
      distinct_tags: distinctTags,
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
      .select('id')
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

    const { data: item, error: itemError } = await supabase
      .from('list_items')
      .upsert(
        { list_id: params.id, place_id: placeId },
        { onConflict: 'list_id,place_id' }
      )
      .select('id, list_id, place_id, tags')
      .single()

    if (itemError || !item) {
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
