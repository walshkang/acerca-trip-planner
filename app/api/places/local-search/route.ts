import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT)
}

function rankMatch(name: string, address: string | null, query: string): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  if (address && address.toLowerCase().includes(q)) return 3
  return 4
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
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const limit = parseLimit(url.searchParams.get('limit'))
    const pattern = `%${query}%`

    const { data, error } = await supabase
      .from('places_view')
      .select('id, name, category, address, created_at')
      .or(`name.ilike.${pattern},address.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as Array<{
      id: string
      name: string
      category: string
      address: string | null
      created_at: string
    }>

    const results = rows
      .map((row) => ({
        ...row,
        _score: rankMatch(row.name, row.address, query),
      }))
      .sort((a, b) => {
        if (a._score !== b._score) return a._score - b._score
        return a.name.localeCompare(b.name)
      })
      .slice(0, limit)
      .map(({ _score, created_at, ...rest }) => rest)

    return NextResponse.json({ query, results })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
