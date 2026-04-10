import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isUuid(s: string | unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST(request: NextRequest, { params }: { params: { listId: string } }) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const listId = params.listId

    const body = (await request.json().catch(() => ({}))) as {
      research_source_id?: unknown
      research_place_id?: unknown
    }

    if (!isUuid(body.research_source_id) || !isUuid(body.research_place_id)) {
      return NextResponse.json({ error: 'research_source_id and research_place_id are required UUIDs' }, { status: 400 })
    }

    // verify target list exists and is accessible to the user
    const { data: list, error: listErr } = await supabase.from('lists').select('id, user_id').eq('id', listId).maybeSingle()
    if (listErr || !list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
    if (list.user_id !== user.id) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    // verify research_place exists and belongs to a source attached to a research_list the user owns
    const { data: rp } = await supabase.from('research_places').select('*').eq('id', body.research_place_id).maybeSingle()
    if (!rp) return NextResponse.json({ error: 'Research place not found' }, { status: 404 })

    const { data: rs } = await supabase.from('research_sources').select('id, research_list_id').eq('id', body.research_source_id).maybeSingle()
    if (!rs || rs.id !== rp.research_source_id) return NextResponse.json({ error: 'Research place / source mismatch' }, { status: 400 })

    const { data: rl } = await supabase.from('research_lists').select('id, user_id').eq('id', rs.research_list_id).maybeSingle()
    if (!rl) return NextResponse.json({ error: 'Research list not found' }, { status: 404 })
    if (rl.user_id !== user.id) return NextResponse.json({ error: 'Research list not found' }, { status: 404 })

    // Prepare place payload for upsert into places (user-owned)
    const lat = typeof rp.lat === 'number' ? rp.lat : null
    const lng = typeof rp.lng === 'number' ? rp.lng : null
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Research place missing lat/lng' }, { status: 400 })
    }

    const sourceId = `research:${rp.id}`
    const location = `SRID=4326;POINT(${rp.lng} ${rp.lat})`

    const placePayload = {
      user_id: user.id,
      name: rp.name,
      address: rp.address ?? null,
      category: 'Activity' as const,
      source: 'research' as const,
      source_id: sourceId,
      google_place_id: rp.place_id ?? null,
      dedupe_key: sourceId,
      enrichment_source_hash: 'research_copy_v1',
      location,
    }

    // Upsert place by (user_id, source, source_id) to avoid duplicates
    const { data: placeRow, error: placeErr } = await supabase
      .from('places')
      .upsert(placePayload, { onConflict: 'user_id,source,source_id' })
      .select('id')
      .single()

    if (placeErr || !placeRow) {
      return NextResponse.json({ error: placeErr?.message ?? 'Failed to create place' }, { status: 500 })
    }

    const placeId = placeRow.id

    // Insert into list_items (dedupe handled similar to existing endpoints)
    const { data: item, error: itemErr } = await supabase
      .from('list_items')
      .insert({ list_id: listId, place_id: placeId })
      .select('id, list_id, place_id')
      .maybeSingle()

    if (itemErr) {
      if (itemErr.code === '23505') {
        // already exists — return the existing item
        const { data: existing } = await supabase
          .from('list_items')
          .select('id, list_id, place_id')
          .eq('list_id', listId)
          .eq('place_id', placeId)
          .maybeSingle()
        return NextResponse.json({ item: existing })
      }
      return NextResponse.json({ error: itemErr.message }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
