import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeTagList } from '@/lib/lists/tags'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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
      tags?: unknown
    }

    const normalized = normalizeTagList(body.tags)
    if (normalized === null) {
      return NextResponse.json(
        { error: 'tags must be a string or string[]' },
        { status: 400 }
      )
    }

    const { data: item, error } = await supabase
      .from('list_items')
      .update({ tags: normalized })
      .eq('id', params.itemId)
      .eq('list_id', params.id)
      .select('id, tags')
      .single()

    if (error || !item) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'List item not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: error?.message || 'Failed to update tags' },
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
