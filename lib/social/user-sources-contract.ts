/**
 * Contract for GET /api/enrichment/user-sources (S6c consumes this shape).
 * Rows are produced by `public.list_user_social_sources()` — keep in sync.
 */

import type { Callout } from '@/lib/social/extraction-contract'

export type UserSocialSourcePlace = {
  place_id: string
  place_name: string
  category: string
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  address: string | null
  opening_hours: unknown | null
  snippet: string
  sentiment: string | null
  tags: string[]
  callouts: Callout[]
  lat: number | null
  lng: number | null
}

export type UserSocialSourceRow = {
  source_id: string
  created_at: string
  url: string
  platform: string
  title: string | null
  author_name: string
  author_persona: string
  places: UserSocialSourcePlace[]
}

export type UserSocialSourcesGetResponse = {
  sources: UserSocialSourceRow[]
}
