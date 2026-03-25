import type {
  GooglePlacesAddressComponent,
  GooglePlacesResult,
  GooglePlacesTextCandidate,
} from '@/lib/enrichment/sources'
import { googleMapsUrl } from '@/lib/export/google-maps-url'
import { inferCategoryFromGoogleTypes } from '@/lib/places/infer-category-from-google-types'
import type { CategoryEnum } from '@/lib/types/enums'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { ResolvedCandidate, ResolvedEnrichment } from '@/lib/import/contract'

function isCategoryEnum(v: unknown): v is CategoryEnum {
  return typeof v === 'string' && (CATEGORY_ENUM_VALUES as readonly string[]).includes(v)
}

function neighborhoodFromAddressComponents(
  components: GooglePlacesAddressComponent[] | undefined
): string | null {
  if (!Array.isArray(components) || components.length === 0) return null
  const prefer = ['neighborhood', 'sublocality_level_1', 'sublocality']
  for (const t of prefer) {
    const c = components.find((x) => Array.isArray(x.types) && x.types.includes(t))
    if (c?.long_name) return c.long_name
  }
  return null
}

function categoryForPreview(
  google: GooglePlacesResult,
  inputCategory: CategoryEnum | undefined
): CategoryEnum {
  const types = google.types
  if (Array.isArray(types) && types.length > 0) {
    return inferCategoryFromGoogleTypes(types)
  }
  if (inputCategory !== undefined && isCategoryEnum(inputCategory)) {
    return inputCategory
  }
  return 'Activity'
}

/**
 * Map Google Places Details payload to import preview `ResolvedEnrichment` (no Wikipedia).
 */
export function mapGooglePlaceToResolvedEnrichment(
  google: GooglePlacesResult,
  inputCategory: CategoryEnum | undefined
): ResolvedEnrichment {
  const lat = google.geometry?.location?.lat
  const lng = google.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Google Places result missing geometry')
  }

  const weekdayText = google.opening_hours?.weekday_text
  const opening_hours =
    Array.isArray(weekdayText) && weekdayText.every((s) => typeof s === 'string')
      ? (weekdayText as string[])
      : null

  const rating = typeof google.rating === 'number' ? google.rating : null
  const price =
    typeof google.price_level === 'number' ? google.price_level : null
  const reviews =
    typeof google.user_ratings_total === 'number' ? google.user_ratings_total : null

  const mapsUrl =
    (typeof google.url === 'string' && google.url.length > 0
      ? google.url
      : googleMapsUrl({
          google_place_id: google.place_id,
          lat,
          lng,
        })) ?? `https://www.google.com/maps/place/?q=place_id:${google.place_id}`

  return {
    place_name: google.name,
    google_place_id: google.place_id,
    neighborhood: neighborhoodFromAddressComponents(google.address_components),
    lat,
    lng,
    google_rating: rating,
    google_price_level: price,
    google_review_count: reviews,
    opening_hours,
    energy: 'Medium',
    category: categoryForPreview(google, inputCategory),
    website: typeof google.website === 'string' ? google.website : null,
    google_maps_url: mapsUrl,
  }
}

/** Find Place candidate with geometry only (map pins are truth). */
export function candidateToResolvedCandidate(
  c: GooglePlacesTextCandidate
): ResolvedCandidate | null {
  const lat = c.geometry?.location?.lat
  const lng = c.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  const name = typeof c.name === 'string' ? c.name : ''
  const addr =
    typeof c.formatted_address === 'string' ? c.formatted_address : null
  return {
    google_place_id: c.place_id,
    place_name: name,
    address: addr,
    google_rating: null,
    lat,
    lng,
  }
}
