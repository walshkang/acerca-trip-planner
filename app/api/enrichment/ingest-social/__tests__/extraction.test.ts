import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIngestSocialSource = vi.fn()

vi.mock('@/lib/server/social/ingest', () => ({
  ingestSocialSource: mockIngestSocialSource,
}))

describe('POST /api/enrichment/ingest-social route guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SOCIAL_INGEST_KEY = 'test-ingest-key'
    mockIngestSocialSource.mockResolvedValue({
      source_id: 'source-uuid-1',
      places_resolved: 1,
      places_failed: 0,
      failures: [],
    })
  })

  it('returns 401 when ingest key is missing or invalid', async () => {
    const { POST } = await import('@/app/api/enrichment/ingest-social/route')

    const response = await POST(
      new Request('http://localhost/api/enrichment/ingest-social', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/video',
          platform: 'youtube',
          author_name: 'Creator',
          transcript: 'This transcript is long enough for schema validation.',
        }),
      }) as import('next/server').NextRequest
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockIngestSocialSource).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid request contract and skips orchestrator', async () => {
    const { POST } = await import('@/app/api/enrichment/ingest-social/route')

    const response = await POST(
      new Request('http://localhost/api/enrichment/ingest-social', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Ingest-Key': 'test-ingest-key',
        },
        body: JSON.stringify({
          transcript: 'too short',
        }),
      }) as import('next/server').NextRequest
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('expected string')
    expect(mockIngestSocialSource).not.toHaveBeenCalled()
  })
})
