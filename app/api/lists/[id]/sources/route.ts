import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
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
      .select('id, list_type')
      .eq('id', params.id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (list.list_type !== 'research') {
      return NextResponse.json(
        { error: 'list is not a research list' },
        { status: 400 }
      )
    }

    const { data: rows, error } = await supabase
      .from('list_sources')
      .select('id, source_id, is_starred, created_at')
      .eq('list_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sources: rows ?? [] })
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

    const body = (await request.json()) as { source_id?: string }
    const sourceId = typeof body?.source_id === 'string' ? body.source_id : null
    if (!sourceId) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 })
    }

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
        { error: 'list is not a research list' },
        { status: 400 }
      )
    }

    const { data: row, error } = await supabase
      .from('list_sources')
      .insert({ list_id: params.id, source_id: sourceId })
      .select('id, source_id, is_starred, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'source already attached to this list' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ source: row })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
