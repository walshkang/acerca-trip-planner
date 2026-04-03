import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAP_LAYERS = new Set(['default', 'transit', 'terrain'])
const TRANSIT_MODES = new Set(['subway', 'bus', 'rail', 'ferry'])

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
      .select('map_layer, transit_modes, dismissed_tips, tips_disabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      map_layer: data?.map_layer ?? 'default',
      transit_modes: data?.transit_modes ?? ['subway'],
      dismissed_tips: data?.dismissed_tips ?? [],
      tips_disabled: data?.tips_disabled ?? false,
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

    const body = (await request.json()) as {
      map_layer?: unknown
      transit_modes?: unknown
      dismissed_tips?: unknown
      tips_disabled?: unknown
    }

    const updates: Record<string, unknown> = { user_id: user.id }

    if (body.map_layer !== undefined) {
      if (typeof body.map_layer !== 'string' || !MAP_LAYERS.has(body.map_layer)) {
        return NextResponse.json({ error: 'Invalid layer' }, { status: 400 })
      }
      updates.map_layer = body.map_layer
    }

    if (body.transit_modes !== undefined) {
      if (!Array.isArray(body.transit_modes) || body.transit_modes.length < 1) {
        return NextResponse.json({ error: 'Invalid transit_modes' }, { status: 400 })
      }
      const seen = new Set<string>()
      const normalized: string[] = []
      for (const m of body.transit_modes) {
        if (typeof m !== 'string' || !TRANSIT_MODES.has(m)) {
          return NextResponse.json({ error: 'Invalid transit_modes' }, { status: 400 })
        }
        if (seen.has(m)) continue
        seen.add(m)
        normalized.push(m)
      }
      if (normalized.length < 1) {
        return NextResponse.json({ error: 'Invalid transit_modes' }, { status: 400 })
      }
      updates.transit_modes = normalized
    }

    if (body.dismissed_tips !== undefined) {
      if (
        !Array.isArray(body.dismissed_tips) ||
        !body.dismissed_tips.every((t: unknown) => typeof t === 'string')
      ) {
        return NextResponse.json({ error: 'Invalid dismissed_tips' }, { status: 400 })
      }
      updates.dismissed_tips = body.dismissed_tips
    }

    if (body.tips_disabled !== undefined) {
      if (typeof body.tips_disabled !== 'boolean') {
        return NextResponse.json({ error: 'Invalid tips_disabled' }, { status: 400 })
      }
      updates.tips_disabled = body.tips_disabled
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase.from('user_preferences').upsert(
      updates,
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
