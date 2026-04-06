import type { SourcePlaceState } from '@/lib/state/useSourcesStore'
import type { UserSocialSourceRow } from '@/lib/social/user-sources-contract'

/** Payload for Sources → itinerary export (S6d sheet). */
export type SourcesExportPayload = {
  sources: UserSocialSourceRow[]
  placeState: Record<string, SourcePlaceState>
}

/** One resolved place row for export (excluded places omitted by the panel). */
export type ExportItem = {
  place_id: string
  google_place_id: string | null
  place_name: string
  category: string
  day_index?: number
  tags: string[]
}

/** Response shape for POST /api/lists/import-from-sources */
export type ImportFromSourcesResponse = {
  list_id: string
  list_name: string
  inserted_count: number
  duplicate_items: Array<{
    place_id: string
    place_name: string
    existing_day_index: number | null
    requested_day_index: number | undefined
  }>
}
