import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFetchTranscript } = vi.hoisted(() => ({
  mockFetchTranscript: vi.fn(),
}))

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: mockFetchTranscript,
  },
}))

import { fetchContent } from '@/lib/server/social/fetch-content'

describe('fetchContent', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mockFetchTranscript.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('YouTube: merges oEmbed metadata and transcript segments', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Video Title', author_name: 'Channel Name' }),
    })
    mockFetchTranscript.mockResolvedValue([
      { text: 'Hello', duration: 0.5, offset: 0 },
      { text: 'world', duration: 0.5, offset: 0.5 },
    ])

    const result = await fetchContent('https://www.youtube.com/watch?v=testid')

    expect(result).toEqual({
      url: 'https://www.youtube.com/watch?v=testid',
      platform: 'youtube',
      author_name: 'Channel Name',
      title: 'Video Title',
      transcript: 'Hello world',
    })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('youtube.com/oembed'))
  })

  it('Blog: extracts article text and strips script and nav', async () => {
    const html = `<!DOCTYPE html><html><head><title>Ignored</title></head><body>
      <nav>Navigation noise</nav>
      <script>alert(1)</script>
      <article><p>Main body</p><p>Second line</p></article>
    </body></html>`
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => html,
    })

    const result = await fetchContent('https://example.com/post')

    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.platform).toBe('blog')
    expect(result.transcript).toContain('Main body')
    expect(result.transcript).toContain('Second line')
    expect(result.transcript).not.toContain('Navigation noise')
    expect(result.transcript).not.toContain('alert')
  })

  it('returns platform_not_supported for TikTok', async () => {
    const result = await fetchContent('https://www.tiktok.com/@user/video/123')
    expect(result).toEqual({ error: 'platform_not_supported' })
  })

  it('returns platform_not_supported for Reddit', async () => {
    const result = await fetchContent('https://www.reddit.com/r/travel/comments/abc/thread')
    expect(result).toEqual({ error: 'platform_not_supported' })
  })

  it('YouTube: no_transcript when segments are empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'T', author_name: 'A' }),
    })
    mockFetchTranscript.mockResolvedValue([])

    const result = await fetchContent('https://youtu.be/abc123')
    expect(result).toEqual({ error: 'no_transcript' })
  })

  it('invalid_url for malformed input', async () => {
    const result = await fetchContent('not-a-url')
    expect(result).toEqual({ error: 'invalid_url' })
  })
})
