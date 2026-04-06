import { getSupabase } from '@/lib/supabase/client'
import type { Persona } from '@/lib/social/extraction-contract'

export type SocialPlaceSnippet = {
  author_name: string
  snippet: string
  platform: string
  sentiment: string | null
}

export type SocialPlace = {
  place_id: string
  name: string
  category: string
  lat: number
  lng: number
  mention_count: number
  personas: Persona[]
  top_snippets: SocialPlaceSnippet[]
}

export type SocialPlaceQuery = {
  persona?: Persona | null
  minMentions?: number
  bounds?: { west: number; south: number; east: number; north: number } | null
}

function toBoundsEwkt(bounds: NonNullable<SocialPlaceQuery['bounds']>): string {
  return `SRID=4326;POLYGON((${bounds.west} ${bounds.south},${bounds.east} ${bounds.south},${bounds.east} ${bounds.north},${bounds.west} ${bounds.north},${bounds.west} ${bounds.south}))`
}

export async function fetchSocialPlaces(
  query: SocialPlaceQuery = {}
): Promise<{ data: SocialPlace[]; error: string | null }> {
  const supabase = getSupabase()
  const params: Record<string, unknown> = {}

  if (query.persona) params.p_persona = query.persona
  if (query.minMentions && query.minMentions > 1) {
    params.p_min_mentions = query.minMentions
  }
  if (query.bounds) params.p_bounds = toBoundsEwkt(query.bounds)

  const { data, error } = await supabase.rpc('discover_social_places', params)

  if (error) {
    return { data: [], error: error.message }
  }

  return {
    data: (data ?? []) as SocialPlace[],
    error: null,
  }
}
