import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const body = (await request.json()) as {
      place_id?: string
      vote_value?: number | null
    }
    const placeId = typeof body?.place_id === 'string' ? body.place_id : null
    if (!placeId) {
      return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
    }

    const rawVote = body.vote_value
    const clearVote = rawVote === null

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, list_type')
      .eq('id', params.id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (list.list_type !== 'research') {
      return NextResponse.json(
        { error: 'votes are only supported on research lists' },
        { status: 400 }
      )
    }

    if (clearVote) {
      const { error: delErr } = await supabase
        .from('research_votes')
        .delete()
        .eq('list_id', params.id)
        .eq('place_id', placeId)
        .eq('user_id', user.id)

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, cleared: true })
    }

    if (rawVote !== 1 && rawVote !== -1) {
      return NextResponse.json(
        { error: 'vote_value must be 1, -1, or null to clear' },
        { status: 400 }
      )
    }

    const { data: row, error } = await supabase
      .from('research_votes')
      .upsert(
        {
          list_id: params.id,
          place_id: placeId,
          user_id: user.id,
          vote_value: rawVote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'list_id,place_id,user_id' }
      )
      .select('list_id, place_id, user_id, vote_value, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vote: row })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
