import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    return NextResponse.json({ list, items: items ?? [] })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
