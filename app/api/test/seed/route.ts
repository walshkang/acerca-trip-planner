import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedPlaceCandidate } from '@/lib/server/testSeed'

type SeedRequest = {
  list_name?: string
  place_name?: string
}

function requireSeedToken(request: NextRequest) {
  const expected = process.env.PLAYWRIGHT_SEED_TOKEN
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction || !expected) {
    return { ok: false, status: 404, error: 'Not found' }
  }

  const header = request.headers.get('x-seed-token') ?? ''
  if (header !== expected) {
    return { ok: false, status: 403, error: 'Invalid seed token' }
  }
  return { ok: true }
}

export async function POST(request: NextRequest) {
  const auth = requireSeedToken(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as SeedRequest
    const suffix = randomUUID().slice(0, 8)
    const listName =
      typeof body.list_name === 'string' && body.list_name.trim()
        ? body.list_name.trim()
        : `Playwright Smoke List ${suffix}`
    const placeName =
      typeof body.place_name === 'string' && body.place_name.trim()
        ? body.place_name.trim()
        : `Playwright Place ${suffix}`

    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert({ user_id: user.id, name: listName })
      .select('id, name')
      .single()

    if (listError || !list) {
      return NextResponse.json(
        { error: listError?.message || 'Failed to create list' },
        { status: 500 }
      )
    }

    const seedInt = Number.parseInt(suffix, 16)
    const latOffset = ((seedInt % 1000) / 1000) * 0.01
    const lngOffset = ((Math.floor(seedInt / 1000) % 1000) / 1000) * 0.01
    const lat = 40.758 + latOffset
    const lng = -73.985 + lngOffset

    const candidate = await seedPlaceCandidate({
      userId: user.id,
      name: placeName,
      address: 'Playwright Seed Address',
      lat,
      lng,
    })

    const { data: placeId, error: promoteError } = await supabase.rpc(
      'promote_place_candidate',
      {
        p_candidate_id: candidate.candidateId,
        p_list_id: list.id,
      }
    )

    if (promoteError || !placeId) {
      return NextResponse.json(
        { error: promoteError?.message || 'Failed to promote seed candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      list,
      place_id: placeId,
      place_name: placeName,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
