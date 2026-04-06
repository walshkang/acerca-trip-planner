import { describe, expect, it } from 'vitest'
import {
  parseIngestSocialRequest,
  parseSocialExtraction,
} from '@/lib/social/extraction-contract'

describe('social extraction contract', () => {
  it('parses valid extraction', () => {
    const result = parseSocialExtraction({
      author_persona: 'foodie',
      mentioned_places: [
        {
          place_name: 'Jay Fai',
          place_type: 'restaurant',
          context_snippet: 'This Michelin-starred street food spot...',
          sentiment: 'positive',
        },
      ],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty mentioned_places', () => {
    const result = parseSocialExtraction({
      author_persona: 'foodie',
      mentioned_places: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid persona', () => {
    const result = parseSocialExtraction({
      author_persona: 'influencer',
      mentioned_places: [
        {
          place_name: 'X',
          context_snippet: 'Y',
          sentiment: 'positive',
        },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('parses valid ingest request', () => {
    const result = parseIngestSocialRequest({
      url: 'https://youtube.com/watch?v=abc',
      platform: 'youtube',
      author_name: 'Mark Wiens',
      transcript: 'Today we are visiting Jay Fai in Bangkok...',
      location_hint: { lat: 13.75, lng: 100.5, city: 'Bangkok' },
    })
    expect(result.ok).toBe(true)
  })

  it('rejects unknown extraction fields', () => {
    const result = parseSocialExtraction({
      author_persona: 'foodie',
      mentioned_places: [
        {
          place_name: 'Jay Fai',
          context_snippet: 'Best crab omelet in Bangkok.',
          sentiment: 'positive',
          extra_field: 'not allowed',
        },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown ingest fields', () => {
    const result = parseIngestSocialRequest({
      url: 'https://youtube.com/watch?v=abc',
      platform: 'youtube',
      author_name: 'Mark Wiens',
      transcript: 'Today we are visiting Jay Fai in Bangkok...',
      unknown_field: true,
    })
    expect(result.ok).toBe(false)
  })
})
