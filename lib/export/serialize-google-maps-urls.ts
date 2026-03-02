import type { ExportRow } from './contract'
import { googleMapsUrl } from './google-maps-url'

/**
 * Serialize export rows as a plain list of Google Maps URLs (one per place).
 *
 * Prefers the `google_maps_url` already resolved on the row, and falls back
 * to constructing one from lat/lng. Places with no URL are skipped.
 */
export function serializeGoogleMapsUrls(rows: ExportRow[]): string[] {
  const urls: string[] = []

  for (const row of rows) {
    const url =
      row.google_maps_url ??
      googleMapsUrl({
        google_place_id: null,
        lat: row.place_lat,
        lng: row.place_lng,
      })
    if (url) urls.push(url)
  }

  return urls
}
