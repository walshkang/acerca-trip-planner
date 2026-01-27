import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const body = (await request.json()) as {
      user_notes?: string | null
      user_tags?: string[] | null
    }

    const user_notes =
      body.user_notes === undefined ? undefined : body.user_notes
    const user_tags = body.user_tags === undefined ? undefined : body.user_tags

    if (
      user_tags !== undefined &&
      user_tags !== null &&
      (!Array.isArray(user_tags) ||
        user_tags.some((t: unknown) => typeof t !== 'string'))
    ) {
      return NextResponse.json(
        { error: 'user_tags must be an array of strings or null' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('places')
      .update({
        ...(user_notes !== undefined ? { user_notes } : {}),
        ...(user_tags !== undefined ? { user_tags } : {}),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, user_notes, user_tags, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Update failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ place: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
