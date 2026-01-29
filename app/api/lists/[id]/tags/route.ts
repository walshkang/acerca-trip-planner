import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { distinctTagsFromItems } from '@/lib/lists/tags'

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

    const { data: items, error } = await supabase
      .from('list_items')
      .select('tags')
      .eq('list_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tags = distinctTagsFromItems((items ?? []) as Array<{ tags?: string[] | null }>)

    return NextResponse.json({ tags })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
