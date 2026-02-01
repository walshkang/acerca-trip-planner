import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeLocalSearchQuery,
  rankLocalSearchMatch,
  resolveCategoryMatch,
} from '@/lib/places/local-search'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20

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
    const rawQuery = url.searchParams.get('q') ?? ''
    const query = rawQuery.trim()
    if (query.length < 2) {
      return NextResponse.json({ query, results: [] })
    }

    const limit = parseLimit(url.searchParams.get('limit'))
    const pattern = `%${query}%`
    const categoryMatch = resolveCategoryMatch(query)
    const normalizedQuery = normalizeLocalSearchQuery(query)
    const normalizedPattern = normalizedQuery ? `%${normalizedQuery}%` : null
    const filters = [`name.ilike.${pattern}`, `address.ilike.${pattern}`]
    if (normalizedPattern) {
      filters.push(`name_normalized.ilike.${normalizedPattern}`)
      filters.push(`address_normalized.ilike.${normalizedPattern}`)
    }
    if (categoryMatch) {
      filters.push(`category.eq.${categoryMatch}`)
    }

    const { data, error } = await supabase
      .from('places')
      .select('id, name, category, address, name_normalized, address_normalized')
      .or(filters.join(','))
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as Array<{
      id: string
      name: string
      category: string
      address: string | null
      name_normalized: string | null
      address_normalized: string | null
    }>

    const results = rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        display_address: row.address ?? null,
        _score: rankLocalSearchMatch(
          row.name,
          row.address,
          row.category,
          query,
          categoryMatch,
          normalizedQuery,
          row.name_normalized,
          row.address_normalized
        ),
      }))
      .sort((a, b) => {
        if (a._score !== b._score) return a._score - b._score
        return a.name.localeCompare(b.name)
      })
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest)

    return NextResponse.json({ query, results })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
