import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const includeSources = new URL(request.url).searchParams.get('include_sources') === 'true'

    const selectFields = includeSources
      ? 'id, user_id, title, description, created_at, updated_at, research_sources(id, title, url, source_type, metadata, transcript)'
      : 'id, user_id, title, description, created_at, updated_at'

    const { data, error } = await supabase.from('research_lists').select(selectFields).eq('id', id).maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // hide existence if the list is owned by another user
    if ((data as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ list: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const body = (await request.json().catch(() => ({}))) as { title?: unknown; description?: unknown }

    const title = typeof body.title === 'string' ? body.title.trim() : null
    const description = typeof body.description === 'string' ? body.description.trim() : null

    const { data: existing, error: listErr } = await supabase
      .from('research_lists')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (listErr || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const patch: Record<string, unknown> = {}
    if (title !== null) patch.title = title
    if (description !== null) patch.description = description

    const { data, error } = await supabase
      .from('research_lists')
      .update(patch)
      .eq('id', id)
      .select('id, title, description, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ list: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const { data: existing, error: listErr } = await supabase
      .from('research_lists')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (listErr || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await supabase.from('research_lists').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return new Response(null, { status: 204 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
