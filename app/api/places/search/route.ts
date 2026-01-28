import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchGooglePlaces } from '@/lib/enrichment/sources'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 10

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const rawQuery =
      url.searchParams.get('q') ??
      url.searchParams.get('query') ??
      url.searchParams.get('input') ??
      ''
    const query = rawQuery.trim()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const limit = parseLimit(url.searchParams.get('limit'))
    const candidates = await searchGooglePlaces(query)

    const results = candidates.slice(0, limit).map((candidate) => ({
      place_id: candidate.place_id,
      name: candidate.name ?? null,
      address: candidate.formatted_address ?? null,
    }))

    return NextResponse.json({ query, results })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
