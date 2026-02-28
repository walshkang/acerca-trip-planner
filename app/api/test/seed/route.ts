import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedPlaceCandidate } from '@/lib/server/testSeed'

type SeedRequest = {
  list_name?: string
  place_name?: string
}

type SeedCleanupRequest = {
  list_ids?: unknown
  place_ids?: unknown
}

function parseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

function isSeedEndpointEnabled(): boolean {
  if (process.env.PLAYWRIGHT_ENABLE_SEED === 'true') {
    return true
  }

  return process.env.NODE_ENV !== 'production'
}

function requireSeedToken(request: NextRequest) {
  const expected = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!expected) {
    return { ok: false, status: 500, error: 'PLAYWRIGHT_SEED_TOKEN not set' }
  }

  const header = request.headers.get('x-seed-token') ?? ''
  if (header !== expected) {
    return { ok: false, status: 403, error: 'Invalid seed token' }
  }

  return { ok: true }
}

export async function POST(request: NextRequest) {
  if (!isSeedEndpointEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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
    const suffix = crypto.randomUUID().slice(0, 8)
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

    const lat = 40.758 + Math.random() * 0.01
    const lng = -73.985 + Math.random() * 0.01
    const sourceId = crypto.randomUUID()

    const candidate = await seedPlaceCandidate({
      userId: user.id,
      name: placeName,
      address: 'Playwright Seed Address',
      lat,
      lng,
      sourceId,
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

export async function DELETE(request: NextRequest) {
  if (!isSeedEndpointEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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

    const body = (await request.json().catch(() => ({}))) as SeedCleanupRequest
    const listIds = parseIdArray(body.list_ids)
    const placeIds = parseIdArray(body.place_ids)
    const isSweepMode = listIds.length === 0 && placeIds.length === 0

    if (isSweepMode) {
      // Sweep: delete all Playwright-created lists, places, and place_candidates by name prefix (sequential to avoid lock contention).
      const LIST_PREFIX = 'Playwright Smoke List %'
      const PLACE_PREFIX = 'Playwright Place %'

      const { data: listRows } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
        .like('name', LIST_PREFIX)
      const sweepListIds = (listRows ?? []).map((r) => r.id)

      const { data: placeRows } = await supabase
        .from('places')
        .select('id')
        .eq('user_id', user.id)
        .like('name', PLACE_PREFIX)
      const sweepPlaceIds = (placeRows ?? []).map((r) => r.id)

      const { data: candidateRows } = await supabase
        .from('place_candidates')
        .select('id')
        .eq('user_id', user.id)
        .like('name', PLACE_PREFIX)
      const sweepCandidateIds = (candidateRows ?? []).map((r) => r.id)

      let deletedLists = 0
      let deletedPlaces = 0
      let deletedPlaceCandidates = 0

      if (sweepListIds.length > 0) {
        const { data, error } = await supabase
          .from('lists')
          .delete()
          .eq('user_id', user.id)
          .in('id', sweepListIds)
          .select('id')
        if (error) {
          return NextResponse.json(
            { error: error.message || 'Failed to delete seeded lists' },
            { status: 500 }
          )
        }
        deletedLists = data?.length ?? 0
      }

      if (sweepPlaceIds.length > 0) {
        const { data, error } = await supabase
          .from('places')
          .delete()
          .eq('user_id', user.id)
          .in('id', sweepPlaceIds)
          .select('id')
        if (error) {
          return NextResponse.json(
            { error: error.message || 'Failed to delete seeded places' },
            { status: 500 }
          )
        }
        deletedPlaces = data?.length ?? 0
      }

      if (sweepCandidateIds.length > 0) {
        const { data, error } = await supabase
          .from('place_candidates')
          .delete()
          .eq('user_id', user.id)
          .in('id', sweepCandidateIds)
          .select('id')
        if (error) {
          return NextResponse.json(
            { error: error.message || 'Failed to delete seeded place_candidates' },
            { status: 500 }
          )
        }
        deletedPlaceCandidates = data?.length ?? 0
      }

      return NextResponse.json({
        deleted_lists: deletedLists,
        deleted_places: deletedPlaces,
        deleted_place_candidates: deletedPlaceCandidates,
      })
    }

    // Explicit ids: delete only the given lists and places (per-test cleanup).
    let deletedLists = 0
    let deletedPlaces = 0

    if (listIds.length > 0) {
      const { data, error } = await supabase
        .from('lists')
        .delete()
        .eq('user_id', user.id)
        .in('id', listIds)
        .select('id')

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to delete seeded lists' },
          { status: 500 }
        )
      }
      deletedLists = data?.length ?? 0
    }

    if (placeIds.length > 0) {
      const { data, error } = await supabase
        .from('places')
        .delete()
        .eq('user_id', user.id)
        .in('id', placeIds)
        .select('id')

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to delete seeded places' },
          { status: 500 }
        )
      }
      deletedPlaces = data?.length ?? 0
    }

    return NextResponse.json({
      deleted_lists: deletedLists,
      deleted_places: deletedPlaces,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
