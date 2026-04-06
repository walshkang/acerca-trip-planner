/**
 * Contract for GET /api/enrichment/user-sources (S6c consumes this shape).
 * Rows are produced by `public.list_user_social_sources()` — keep in sync.
 */

export type UserSocialSourcePlace = {
  place_id: string
  place_name: string
  category: string
  google_place_id: string | null
  snippet: string
  sentiment: string | null
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
