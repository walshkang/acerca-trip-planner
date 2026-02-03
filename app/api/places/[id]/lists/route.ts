import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
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

    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id')
      .eq('id', params.id)
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

    const { data: items, error } = await supabase
      .from('list_items')
      .select('id, list_id, tags')
      .eq('place_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const listIds = (items ?? []).map((item) => item.list_id)
    const listItems = (items ?? []).map((item) => ({
      id: item.id,
      list_id: item.list_id,
      tags: Array.isArray(item.tags) ? item.tags : [],
    }))

    return NextResponse.json({
      list_ids: listIds,
      list_items: listItems,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
