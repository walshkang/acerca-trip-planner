import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, getEnrichmentByIdMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getEnrichmentByIdMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/server/places/getPlaceEnrichment', () => ({
  getEnrichmentById: getEnrichmentByIdMock,
}))

import { GET } from '@/app/api/places/[id]/details/route'

function makeSupabaseForDetails(options: {
  authenticated?: boolean
  placeRow?: Record<string, unknown> | null
  placeNotFoundOnUserFilter?: boolean
  mentions?: Array<Record<string, unknown>>
} = {}) {
  const authenticated = options.authenticated ?? true
  const placeRow = options.placeRow ?? null
  const mentions = options.mentions ?? []
  const placeNotFoundOnUserFilter = options.placeNotFoundOnUserFilter ?? false

  const placeSingleMock = vi
    .fn()
    .mockResolvedValue({ data: placeRow, error: placeRow ? null : { code: 'PGRST116' } })

  const filteredSingleMock = vi.fn().mockResolvedValue({
    data: null,
    error: { code: 'PGRST116', message: 'No rows' },
  })

  const placeEqAfterId = {
    single: placeSingleMock,
    eq: vi.fn((column: string) => {
      if (column === 'user_id' && placeNotFoundOnUserFilter) {
        return { single: filteredSingleMock }
      }
      return { single: placeSingleMock }
    }),
  }

  const placeSelect = {
    eq: vi.fn((column: string) => {
      if (column === 'id') return placeEqAfterId
      return placeEqAfterId
    }),
  }

  const socialMentionsLimit = vi.fn().mockResolvedValue({ data: mentions, error: null })
  const socialMentionsOrder = vi.fn(() => ({ limit: socialMentionsLimit }))
  const socialMentionsEq = vi.fn(() => ({ order: socialMentionsOrder }))
  const socialMentionsSelect = vi.fn(() => ({ eq: socialMentionsEq }))

  const from = vi.fn((table: string) => {
    if (table === 'places') {
      return {
        select: vi.fn(() => placeSelect),
      }
    }
    if (table === 'social_mentions') {
      return {
        select: socialMentionsSelect,
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: 'user-1' } : null },
        }),
      },
      from,
    },
    socialMentionsSelect,
  }
}

describe('GET /api/places/[id]/details', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    getEnrichmentByIdMock.mockReset()
    getEnrichmentByIdMock.mockResolvedValue(null)
  })

  it('returns 401 when unauthenticated', async () => {
    const mock = makeSupabaseForDetails({ authenticated: false })
    createClientMock.mockResolvedValue(mock.client)

    const res = await GET(new Request('http://localhost/api/places/p-social'), {
      params: { id: 'p-social' },
    })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('returns social place details even when not owned by current user', async () => {
    const mock = makeSupabaseForDetails({
      placeRow: {
        id: 'p-social',
        user_id: 'social-system-user',
        name: 'Social Spot',
        address: '123 Main St',
        category: 'Food',
        energy: null,
        opening_hours: null,
        enrichment_id: null,
        user_notes: null,
        user_tags: null,
        enriched_at: null,
        enrichment_version: null,
        source: 'social',
      },
      placeNotFoundOnUserFilter: true,
      mentions: [
        {
          snippet: 'Great place',
          sentiment: 'positive',
          social_sources: {
            author_name: 'Creator',
            platform: 'youtube',
            author_persona: 'foodie',
            url: 'https://example.com',
            title: 'Trip guide',
          },
        },
      ],
    })
    createClientMock.mockResolvedValue(mock.client)

    const res = await GET(new Request('http://localhost/api/places/p-social'), {
      params: { id: 'p-social' },
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      place: { id: 'p-social', source: 'social' },
      social_mentions: [
        {
          snippet: 'Great place',
        },
      ],
    })
    expect(mock.socialMentionsSelect).toHaveBeenCalled()
  })
})
