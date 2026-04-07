import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateObject = vi.fn()
const mockSocialSourcesUpsert = vi.fn()
const mockPlacesUpsert = vi.fn()
const mockPlacesLookup = vi.fn()
const mockSocialMentionsInsert = vi.fn()

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
}))

let placeUpsertSingleQueue: Array<{ data: { id: string } | null; error: { message: string } | null }>
let mentionUpsertQueue: Array<{ data: unknown; error: { message: string } | null }>

vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'social_sources') {
        return {
          upsert: (...args: unknown[]) => {
            mockSocialSourcesUpsert(...args)
            return {
              select: () => ({
                single: async () => ({ data: { id: 'source-uuid-1' }, error: null }),
              }),
            }
          },
        }
      }

      if (table === 'places') {
        return {
          upsert: (...args: unknown[]) => {
            mockPlacesUpsert(...args)
            return {
              select: () => ({
                maybeSingle: async () => {
                  const next = placeUpsertSingleQueue.shift()
                  return next ?? { data: { id: 'place-uuid-default' }, error: null }
                },
              }),
            }
          },
          select: (...args: unknown[]) => {
            mockPlacesLookup(...args)
            return {
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'place-uuid-existing' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          },
        }
      }

      if (table === 'social_mentions') {
        return {
          upsert: async (...args: [unknown, unknown]) => {
            mockSocialMentionsInsert(...args)
            const next = mentionUpsertQueue.shift()
            if (next) return next
            return { data: [{ id: 'mention-uuid-1' }], error: null }
          },
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  })),
}))

describe('POST /api/enrichment/ingest-social integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    placeUpsertSingleQueue = []
    mentionUpsertQueue = []
    process.env.GOOGLE_PLACES_API_KEY = 'test-google-key'
    process.env.SOCIAL_INGEST_KEY = 'test-ingest-key'
    process.env.SOCIAL_SYSTEM_USER_ID = '11111111-1111-1111-1111-111111111111'

    mockGenerateObject.mockResolvedValue({
      object: {
        author_persona: 'foodie',
        mentioned_places: [
          {
            place_name: "Luigi's Pizza",
            place_type: 'restaurant',
            context_snippet: 'Best slice in town.',
            sentiment: 'positive',
            tags: ['late-night', 'casual'],
            callouts: [{ type: 'dish', text: 'vodka slice' }],
          },
          {
            place_name: 'Ghost Bistro',
            context_snippet: 'People said this one was okay.',
            sentiment: 'neutral',
          },
        ],
      },
    })

    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (!url.startsWith('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')) {
        throw new Error(`Unexpected fetch URL: ${url}`)
      }

      const parsed = new URL(url)
      const inputQuery = parsed.searchParams.get('input')
      if (inputQuery?.includes("Luigi's Pizza")) {
        return new Response(
          JSON.stringify({
            status: 'OK',
            candidates: [
              {
                place_id: 'ChIJ_luigi',
                name: "Luigi's Pizza",
                geometry: { location: { lat: 40.7128, lng: -74.006 } },
                rating: 4.7,
                user_ratings_total: 2134,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          status: 'ZERO_RESULTS',
          candidates: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })
  })

  function makeRequest(body: Record<string, unknown>) {
    return new Request('http://localhost/api/enrichment/ingest-social', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Ingest-Key': 'test-ingest-key',
      },
      body: JSON.stringify(body),
    }) as import('next/server').NextRequest
  }

  it('resolves places, writes social rows, and returns partial failures', async () => {
    placeUpsertSingleQueue.push({ data: { id: 'place-uuid-1' }, error: null })

    const { POST } = await import('@/app/api/enrichment/ingest-social/route')

    const response = await POST(
      makeRequest({
        url: 'https://example.com/video',
        platform: 'youtube',
        author_name: 'Test Creator',
        transcript:
          "Luigi's Pizza has the best slice in town. Ghost Bistro sounded fine too.",
        title: 'Pizza review',
        location_hint: {
          lat: 40.71,
          lng: -74.0,
          city: 'New York',
        },
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      source_id: string
      places_resolved: number
      places_failed: number
      failures: Array<{ place_name: string; reason: string }>
    }
    expect(payload).toEqual({
      source_id: 'source-uuid-1',
      places_resolved: 1,
      places_failed: 1,
      failures: [{ place_name: 'Ghost Bistro', reason: 'no_google_match' }],
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(mockSocialSourcesUpsert).toHaveBeenCalledTimes(1)
    expect(mockSocialSourcesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/video',
        platform: 'youtube',
        author_name: 'Test Creator',
        author_persona: 'foodie',
      }),
      expect.objectContaining({ onConflict: 'url' })
    )

    expect(mockPlacesUpsert).toHaveBeenCalledTimes(1)
    expect(mockPlacesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'social',
        source_id: 'google:ChIJ_luigi',
        location: 'SRID=4326;POINT(-74.006 40.7128)',
        google_rating: 4.7,
        google_review_count: 2134,
      }),
      expect.objectContaining({
        onConflict: 'user_id,source,source_id',
      })
    )

    expect(mockSocialMentionsInsert).toHaveBeenCalledTimes(1)
    expect(mockSocialMentionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: 'source-uuid-1',
        place_id: 'place-uuid-1',
        tags: ['late-night', 'casual'],
        callouts: [{ type: 'dish', text: 'vodka slice' }],
      }),
      expect.objectContaining({
        onConflict: 'source_id,place_id',
      })
    )
  })

  it('uses place lookup fallback when upsert returns no row (idempotent place path)', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        author_persona: 'foodie',
        mentioned_places: [
          {
            place_name: "Luigi's Pizza",
            place_type: 'restaurant',
            context_snippet: 'Best slice in town.',
            sentiment: 'positive',
          },
        ],
      },
    })
    placeUpsertSingleQueue.push({ data: null, error: null })

    const { POST } = await import('@/app/api/enrichment/ingest-social/route')
    const response = await POST(
      makeRequest({
        url: 'https://example.com/video-lookup',
        platform: 'youtube',
        author_name: 'Test Creator',
        transcript: "Luigi's Pizza has the best slice in town.",
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      places_resolved: number
      places_failed: number
      failures: Array<{ place_name: string; reason: string }>
    }
    expect(payload).toMatchObject({
      places_resolved: 1,
      places_failed: 0,
      failures: [],
    })
    expect(mockPlacesLookup).toHaveBeenCalled()
    expect(mockSocialMentionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: 'place-uuid-existing',
      }),
      expect.any(Object)
    )
  })

  it('continues ingestion when mention persistence fails and reports structured failure reason', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        author_persona: 'foodie',
        mentioned_places: [
          {
            place_name: "Luigi's Pizza",
            place_type: 'restaurant',
            context_snippet: 'Best slice in town.',
            sentiment: 'positive',
          },
          {
            place_name: 'Cafe Luna',
            place_type: 'cafe',
            context_snippet: 'Great pastries.',
            sentiment: 'positive',
          },
        ],
      },
    })

    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      const parsed = new URL(url)
      const inputQuery = parsed.searchParams.get('input')

      if (inputQuery?.includes("Luigi's Pizza")) {
        return new Response(
          JSON.stringify({
            status: 'OK',
            candidates: [
              {
                place_id: 'ChIJ_luigi',
                name: "Luigi's Pizza",
                geometry: { location: { lat: 40.7128, lng: -74.006 } },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }
      if (inputQuery?.includes('Cafe Luna')) {
        return new Response(
          JSON.stringify({
            status: 'OK',
            candidates: [
              {
                place_id: 'ChIJ_cafeluna',
                name: 'Cafe Luna',
                geometry: { location: { lat: 40.7132, lng: -74.001 } },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ status: 'ZERO_RESULTS', candidates: [] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })

    placeUpsertSingleQueue.push(
      { data: { id: 'place-uuid-1' }, error: null },
      { data: { id: 'place-uuid-2' }, error: null }
    )
    mentionUpsertQueue.push(
      { data: [{ id: 'mention-uuid-1' }], error: null },
      { data: null, error: { message: 'insert blocked' } }
    )

    const { POST } = await import('@/app/api/enrichment/ingest-social/route')
    const response = await POST(
      makeRequest({
        url: 'https://example.com/video-mention-failure',
        platform: 'youtube',
        author_name: 'Test Creator',
        transcript: "Luigi's Pizza and Cafe Luna are both worth a stop.",
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      places_resolved: number
      places_failed: number
      failures: Array<{ place_name: string; reason: string }>
    }
    expect(payload.places_resolved).toBe(1)
    expect(payload.places_failed).toBe(1)
    expect(payload.failures).toEqual([
      {
        place_name: 'Cafe Luna',
        reason: 'social_mentions_insert_failed:insert blocked',
      },
    ])
  })

  it('is idempotent for repeated source URL ingestion calls', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        author_persona: 'foodie',
        mentioned_places: [
          {
            place_name: "Luigi's Pizza",
            place_type: 'restaurant',
            context_snippet: 'Best slice in town.',
            sentiment: 'positive',
          },
        ],
      },
    })

    placeUpsertSingleQueue.push(
      { data: { id: 'place-uuid-1' }, error: null },
      { data: { id: 'place-uuid-1' }, error: null }
    )

    const { POST } = await import('@/app/api/enrichment/ingest-social/route')
    const payload = {
      url: 'https://example.com/video-idempotent',
      platform: 'youtube',
      author_name: 'Test Creator',
      transcript: "Luigi's Pizza has the best slice in town.",
    }

    const first = await POST(makeRequest(payload))
    const second = await POST(makeRequest(payload))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mockSocialSourcesUpsert).toHaveBeenCalledTimes(2)
    expect(mockSocialSourcesUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: 'https://example.com/video-idempotent' }),
      expect.objectContaining({ onConflict: 'url' })
    )
    expect(mockSocialSourcesUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'https://example.com/video-idempotent' }),
      expect.objectContaining({ onConflict: 'url' })
    )
  })
})
