import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'
import type { ExportRow, ExportScope } from './contract'
import { extractNeighborhood } from './neighborhood'
import { googleMapsUrl } from './google-maps-url'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'

type SupabaseServerClient = SupabaseClient<Database>

type RawSourcesJson = {
  googlePlaces?: {
    url?: string | null
    website?: string | null
  }
}

function safeRawSources(raw: Json | null | undefined): RawSourcesJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as unknown as RawSourcesJson
}

export async function resolveExportRows(
  supabase: SupabaseServerClient,
  listId: string,
  scope: ExportScope,
  filters?: { categories?: CategoryEnum[]; tags?: string[] }
): Promise<ExportRow[]> {
  const { data: items, error } = await supabase
    .from('list_items')
    .select(
      `id, tags, scheduled_date, scheduled_start_time, completed_at,
       place:places(id, name, address, category, energy, google_place_id, user_notes, user_tags,
         enrichment:enrichments(raw_sources))`
    )
    .eq('list_id', listId)

  if (error) throw new Error(error.message)
  if (!items?.length) return []

  // Collect unique place IDs for lat/lng lookup
  const placeIds: string[] = []
  for (const item of items) {
    const place = item.place as { id: string } | null
    if (place?.id) placeIds.push(place.id)
  }
  const uniquePlaceIds = [...new Set(placeIds)]

  // Fetch lat/lng from places_view
  const latLngById = new Map<string, { lat: number | null; lng: number | null }>()
  if (uniquePlaceIds.length > 0) {
    const { data: placesView } = await supabase
      .from('places_view')
      .select('id, lat, lng')
      .in('id', uniquePlaceIds)
    for (const pv of placesView ?? []) {
      if (pv.id) latLngById.set(pv.id, { lat: pv.lat ?? null, lng: pv.lng ?? null })
    }
  }

  const rows: ExportRow[] = []

  for (const item of items) {
    const place = item.place as {
      id: string
      name: string
      address: string | null
      category: CategoryEnum
      energy: EnergyEnum | null
      google_place_id: string | null
      user_notes: string | null
      user_tags: string[] | null
      enrichment: { raw_sources: Json } | null
    } | null

    if (!place) continue

    // Determine status
    let status: 'backlog' | 'scheduled' | 'done'
    if (item.completed_at) status = 'done'
    else if (item.scheduled_date) status = 'scheduled'
    else status = 'backlog'

    // Apply scope filter
    if (scope !== 'all' && status !== scope) continue

    const itemTags: string[] = item.tags ?? []
    const placeTags: string[] = place.user_tags ?? []

    // Apply tag filter (matches item_tags OR place_user_tags)
    if (filters?.tags && filters.tags.length > 0) {
      const filterTagsLower = filters.tags.map((t) => t.toLowerCase())
      const allTagsLower = [...itemTags, ...placeTags].map((t) => t.toLowerCase())
      if (!filterTagsLower.some((t) => allTagsLower.includes(t))) continue
    }

    // Apply category filter
    if (
      filters?.categories &&
      filters.categories.length > 0 &&
      !filters.categories.includes(place.category)
    ) {
      continue
    }

    const latLng = latLngById.get(place.id) ?? { lat: null, lng: null }
    const rawSources = safeRawSources(place.enrichment?.raw_sources ?? null)

    const mapsUrl =
      rawSources.googlePlaces?.url ??
      googleMapsUrl({
        google_place_id: place.google_place_id,
        lat: latLng.lat,
        lng: latLng.lng,
      })

    rows.push({
      place_name: place.name,
      place_category: place.category,
      place_energy: place.energy ?? null,
      place_address: place.address ?? null,
      place_neighborhood: extractNeighborhood(place.address),
      place_user_notes: place.user_notes ?? null,
      place_user_tags: placeTags,
      place_lat: latLng.lat,
      place_lng: latLng.lng,
      place_id: place.id,
      ...(place.google_place_id
        ? { google_place_id: place.google_place_id }
        : {}),
      google_maps_url: mapsUrl ?? null,
      website: rawSources.googlePlaces?.website ?? null,
      item_tags: itemTags,
      scheduled_date: item.scheduled_date ?? null,
      scheduled_slot: slotFromScheduledStartTime(item.scheduled_start_time),
      status,
    })
  }

  return rows
}
