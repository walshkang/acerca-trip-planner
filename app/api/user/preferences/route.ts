import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAP_LAYERS = new Set(['default', 'transit', 'terrain'])

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('map_layer')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      map_layer: data?.map_layer ?? 'default',
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { map_layer?: unknown }
    const map_layer = body.map_layer
    if (typeof map_layer !== 'string' || !MAP_LAYERS.has(map_layer)) {
      return NextResponse.json({ error: 'Invalid layer' }, { status: 400 })
    }

    const { error } = await supabase.from('user_preferences').upsert(
      { user_id: user.id, map_layer },
      { onConflict: 'user_id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
