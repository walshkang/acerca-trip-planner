import { getSupabase } from '@/lib/supabase/client'
import { type CategoryEnum } from '@/lib/types/enums'

export type ResearchPlaceSnippet = {
  author_name: string
  snippet: string
  platform: string
}

export type ResearchPlaceRow = {
  place_id: string
  name: string
  category: CategoryEnum
  lat: number
  lng: number
  overlap_count: number
  net_score: number
  user_vote: -1 | 1 | null
  top_snippets: ResearchPlaceSnippet[]
}

export type ResearchPlacesQuery = {
  listId: string
  bounds?: { west: number; south: number; east: number; north: number } | null
}

function toBoundsEwkt(bounds: NonNullable<ResearchPlacesQuery['bounds']>): string {
  return `SRID=4326;POLYGON((${bounds.west} ${bounds.south},${bounds.east} ${bounds.south},${bounds.east} ${bounds.north},${bounds.west} ${bounds.north},${bounds.west} ${bounds.south}))`
}

function parseSnippets(raw: unknown): ResearchPlaceSnippet[] {
  if (!Array.isArray(raw)) return []
  const out: ResearchPlaceSnippet[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const author_name = typeof o.author_name === 'string' ? o.author_name : ''
    const snippet = typeof o.snippet === 'string' ? o.snippet : ''
    const platform = typeof o.platform === 'string' ? o.platform : ''
    if (author_name || snippet || platform) {
      out.push({ author_name, snippet, platform })
    }
  }
  return out
}

export async function fetchResearchPlaces(
  query: ResearchPlacesQuery
): Promise<{ data: ResearchPlaceRow[]; error: string | null }> {
  const supabase = getSupabase()
  const params: Record<string, unknown> = {
    p_list_id: query.listId,
  }
  if (query.bounds) params.p_bounds = toBoundsEwkt(query.bounds)

  const { data, error } = await supabase.rpc('discover_research_places', params)

  if (error) {
    return { data: [], error: error.message }
  }

  const rows = (data ?? []) as Array<{
    place_id: string
    name: string
    category: string
    lat: number
    lng: number
    overlap_count: number
    net_score: number
    user_vote: number | null
    top_snippets: unknown
  }>

  return {
    data: rows.map((r) => ({
      place_id: r.place_id,
      name: r.name,
      category: r.category as CategoryEnum,
      lat: r.lat,
      lng: r.lng,
      overlap_count: Number(r.overlap_count),
      net_score: Number(r.net_score),
      user_vote:
        r.user_vote === 1 || r.user_vote === -1
          ? (r.user_vote as -1 | 1)
          : null,
      top_snippets: parseSnippets(r.top_snippets),
    })),
    error: null,
  }
}
