import type { EnrichmentInput, EnrichmentOutput } from '@/lib/enrichment/contract'

function finiteNumberOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v
}

type GoogleReviewFields = Pick<
  EnrichmentOutput['normalizedData'],
  'google_rating' | 'google_review_count'
>

/**
 * Deterministic Google review stats from the raw Places payload (frozen at ingest).
 */
export function frozenGoogleReviewStatsFromSnapshot(
  snapshot: EnrichmentInput['rawSourceSnapshot']
): GoogleReviewFields {
  const google = snapshot.googlePlaces
  if (!google || typeof google !== 'object') {
    return { google_rating: null, google_review_count: null }
  }
  const g = google as Record<string, unknown>
  return {
    google_rating: finiteNumberOrNull(g.rating),
    google_review_count: finiteNumberOrNull(g.user_ratings_total),
  }
}
