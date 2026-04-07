import { describe, expect, it } from 'vitest'
import { precheckSocialIngestUrl } from '@/lib/social/social-ingest-url'

describe('precheckSocialIngestUrl', () => {
  it('allows YouTube and blog-like URLs', () => {
    expect(precheckSocialIngestUrl('https://www.youtube.com/watch?v=abc')).toEqual({ ok: true })
    expect(precheckSocialIngestUrl('https://example.com/post')).toEqual({ ok: true })
  })

  it('rejects TikTok', () => {
    expect(precheckSocialIngestUrl('https://www.tiktok.com/@u/video/1')).toEqual({
      ok: false,
      code: 'platform_not_supported',
    })
  })

  it('rejects invalid URL', () => {
    expect(precheckSocialIngestUrl('not-a-url')).toEqual({
      ok: false,
      code: 'invalid_url',
    })
  })
})
