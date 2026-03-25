import { describe, expect, it } from 'vitest'
import { frozenGoogleReviewStatsFromSnapshot } from '@/lib/server/enrichment/google-review-stats'
import type { EnrichmentInput } from '@/lib/enrichment/contract'

function snap(googlePlaces: unknown): EnrichmentInput['rawSourceSnapshot'] {
  return { googlePlaces: googlePlaces as EnrichmentInput['rawSourceSnapshot']['googlePlaces'] }
}

describe('frozenGoogleReviewStatsFromSnapshot', () => {
  it('returns rating and review count from Google payload', () => {
    expect(
      frozenGoogleReviewStatsFromSnapshot(
        snap({ rating: 4.5, user_ratings_total: 1234 })
      )
    ).toEqual({ google_rating: 4.5, google_review_count: 1234 })
  })

  it('returns nulls when fields missing', () => {
    expect(frozenGoogleReviewStatsFromSnapshot(snap({}))).toEqual({
      google_rating: null,
      google_review_count: null,
    })
  })

  it('returns nulls for non-finite numbers', () => {
    expect(
      frozenGoogleReviewStatsFromSnapshot(
        snap({ rating: NaN, user_ratings_total: Number.POSITIVE_INFINITY })
      )
    ).toEqual({ google_rating: null, google_review_count: null })
  })

  it('returns nulls when googlePlaces is not an object', () => {
    expect(frozenGoogleReviewStatsFromSnapshot(snap(null))).toEqual({
      google_rating: null,
      google_review_count: null,
    })
  })

  it('ignores string coercions', () => {
    expect(
      frozenGoogleReviewStatsFromSnapshot(
        snap({ rating: '4.2', user_ratings_total: '99' })
      )
    ).toEqual({ google_rating: null, google_review_count: null })
  })
})
