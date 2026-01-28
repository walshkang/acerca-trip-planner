import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LIST_FIELDS = 'id, name, description, is_default, created_at'

function normalizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  return trimmed.length ? trimmed : null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lists, error } = await supabase
      .from('lists')
      .select(LIST_FIELDS)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const existing = (lists ?? []) as Array<{
      id: string
      is_default: boolean
    }>

    if (!existing.length || !existing.some((l) => l.is_default)) {
      const { error: insertError } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: 'Saved',
          is_default: true,
        })
        .select(LIST_FIELDS)
        .single()

      if (insertError) {
        // Possible race or uniqueness conflict; fall through to refetch.
      }

      const { data: refreshed } = await supabase
        .from('lists')
        .select(LIST_FIELDS)
        .order('created_at', { ascending: true })

      return NextResponse.json({ lists: refreshed ?? lists ?? [] })
    }

    return NextResponse.json({ lists })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      name?: string
      description?: string | null
    }

    const name = normalizeName(body?.name)
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const description =
      typeof body?.description === 'string' && body.description.trim().length
        ? body.description.trim()
        : null

    const { data: list, error } = await supabase
      .from('lists')
      .insert({
        user_id: user.id,
        name,
        description,
        is_default: false,
      })
      .select(LIST_FIELDS)
      .single()

    if (error || !list) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create list' },
        { status: 500 }
      )
    }

    return NextResponse.json({ list })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
