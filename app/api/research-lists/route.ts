import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('research_lists')
      .select('id, title, description, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lists: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      description?: unknown
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('research_lists')
      .insert({ user_id: user.id, title, description })
      .select('id, title, description, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create research list' }, { status: 500 })
    }

    return NextResponse.json({ list: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
