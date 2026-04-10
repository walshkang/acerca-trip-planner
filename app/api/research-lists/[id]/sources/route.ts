import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const researchListId = params.id

    // verify ownership
    const { data: list, error: listErr } = await supabase
      .from('research_lists')
      .select('id, user_id')
      .eq('id', researchListId)
      .maybeSingle()

    if (listErr || !list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (list.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      url?: unknown
      source_type?: unknown
      metadata?: unknown
      transcript?: unknown
      places?: unknown
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const payload = {
      research_list_id: researchListId,
      title,
      url: typeof body.url === 'string' ? body.url.trim() : null,
      source_type: typeof body.source_type === 'string' ? body.source_type : null,
      metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : null,
      transcript: typeof body.transcript === 'string' ? body.transcript : null,
    }

    const { data: src, error: srcErr } = await supabase
      .from('research_sources')
      .insert(payload)
      .select('*')
      .single()

    if (srcErr || !src) return NextResponse.json({ error: srcErr?.message ?? 'Failed to create source' }, { status: 500 })

    let createdPlaces: unknown[] = []
    if (Array.isArray(body.places) && body.places.length) {
      const rawPlaces = body.places as Array<Record<string, unknown>>
      const placeRows = rawPlaces.map((p) => ({
        research_source_id: src.id,
        name: typeof p.name === 'string' ? p.name : null,
        address: typeof p.address === 'string' ? p.address : null,
        place_id: typeof p.place_id === 'string' ? p.place_id : null,
        rating: typeof p.rating === 'number' ? p.rating : null,
        review_count: typeof p.review_count === 'number' ? p.review_count : null,
        url: typeof p.url === 'string' ? p.url : null,
        lat: typeof p.lat === 'number' ? p.lat : null,
        lng: typeof p.lng === 'number' ? p.lng : null,
        raw_json: typeof p.raw_json === 'object' && p.raw_json !== null ? p.raw_json : null,
      }))

      const { data: inserted, error: insErr } = await supabase.from('research_places').insert(placeRows).select('*')
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
      createdPlaces = inserted ?? []
    }

    return NextResponse.json({ source: src, places: createdPlaces }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const researchListId = params.id

    // verify ownership
    const { data: list, error: listErr } = await supabase
      .from('research_lists')
      .select('id, user_id')
      .eq('id', researchListId)
      .maybeSingle()

    if (listErr || !list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (list.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('research_sources')
      .select('id, title, url, source_type, metadata, transcript, created_at')
      .eq('research_list_id', researchListId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sources: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
