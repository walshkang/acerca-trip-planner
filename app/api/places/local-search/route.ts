import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT)
}

function resolveCategoryMatch(query: string): string | null {
  const normalized = query.toLowerCase()
  for (const value of CATEGORY_ENUM_VALUES) {
    const lower = value.toLowerCase()
    if (normalized === lower || normalized === `${lower}s`) {
      return value
    }
  }
  return null
}

function rankMatch(
  name: string,
  address: string | null,
  category: string,
  query: string,
  categoryMatch: string | null
): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  if (categoryMatch && category === categoryMatch) return 3
  if (address && address.toLowerCase().includes(q)) return 4
  return 5
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
    const filters = [`name.ilike.${pattern}`, `address.ilike.${pattern}`]
    if (categoryMatch) {
      filters.push(`category.eq.${categoryMatch}`)
    }

    const { data, error } = await supabase
      .from('places')
      .select('id, name, category, address')
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
    }>

    const results = rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        display_address: row.address ?? null,
        _score: rankMatch(row.name, row.address, row.category, query, categoryMatch),
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
