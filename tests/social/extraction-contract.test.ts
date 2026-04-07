import { afterEach, describe, expect, it } from 'vitest'
import {
  mentionedPlaceSchema,
  parseIngestSocialRequest,
  parseSocialExtraction,
} from '@/lib/social/extraction-contract'
import {
  extractJsonObjectFromModelText,
  getSocialExtractionOutputMode,
  sanitizeSocialExtractionPayload,
} from '@/lib/server/social/ingest'

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

  it('accepts empty mentioned_places (ghost-town case)', () => {
    const result = parseSocialExtraction({
      author_persona: 'foodie',
      mentioned_places: [],
    })
    expect(result.ok).toBe(true)
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

  it('defaults tags and callouts to empty arrays', () => {
    const parsed = mentionedPlaceSchema.parse({
      place_name: 'Jay Fai',
      context_snippet: 'Best crab omelet in Bangkok.',
      sentiment: 'positive',
    })
    expect(parsed.tags).toEqual([])
    expect(parsed.callouts).toEqual([])
  })

  it('accepts valid callouts and tags', () => {
    const parsed = mentionedPlaceSchema.parse({
      place_name: 'Jay Fai',
      context_snippet: 'Try the crab omelet and orange soda.',
      sentiment: 'positive',
      tags: ['michelin', 'street-food'],
      callouts: [
        { type: 'dish', text: 'crab omelet' },
        { type: 'drink', text: 'orange soda' },
      ],
    })
    expect(parsed.tags).toEqual(['michelin', 'street-food'])
    expect(parsed.callouts).toEqual([
      { type: 'dish', text: 'crab omelet' },
      { type: 'drink', text: 'orange soda' },
    ])
  })

  it('rejects invalid callout type', () => {
    const result = mentionedPlaceSchema.safeParse({
      place_name: 'Jay Fai',
      context_snippet: 'Try the chef special.',
      sentiment: 'positive',
      callouts: [{ type: 'dessert', text: 'mango sticky rice' }],
    })
    expect(result.success).toBe(false)
  })

  it('extracts JSON from markdown-wrapped output', () => {
    const parsed = extractJsonObjectFromModelText(`
\`\`\`json
{"author_persona":"foodie","mentioned_places":[{"place_name":"Jay Fai","context_snippet":"Great crab omelet.","sentiment":"positive","tags":[],"callouts":[]}]}
\`\`\`
`)
    expect(typeof parsed).toBe('object')
    expect(parsed).not.toBeNull()
  })

  it('extracts JSON from prefixed and suffixed prose', () => {
    const parsed = extractJsonObjectFromModelText(
      'Here is the extracted data: {"author_persona":"foodie","mentioned_places":[{"place_name":"Jay Fai","context_snippet":"Great crab omelet.","sentiment":"positive","tags":[],"callouts":[]}]} Thanks!'
    ) as { author_persona: string }
    expect(parsed.author_persona).toBe('foodie')
  })

  it('throws on malformed or truncated JSON', () => {
    expect(() =>
      extractJsonObjectFromModelText('{"author_persona":"foodie","mentioned_places":[')
    ).toThrow(/social_extraction_text_invalid_json/)
  })

  it('sanitizes callout type aliases before parse', () => {
    const sanitized = sanitizeSocialExtractionPayload({
      author_persona: 'foodie',
      mentioned_places: [
        {
          place_name: 'Jay Fai',
          context_snippet: 'Great crab omelet and coffee.',
          sentiment: 'positive',
          callouts: [
            { type: 'food', text: 'crab omelet' },
            { type: 'coffee', text: 'iced coffee' },
          ],
        },
      ],
    })

    const parsed = parseSocialExtraction(sanitized)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.mentioned_places[0].callouts).toEqual([
      { type: 'dish', text: 'crab omelet' },
      { type: 'drink', text: 'iced coffee' },
    ])
  })

  it('drops unknown callout types instead of failing entire extraction', () => {
    const sanitized = sanitizeSocialExtractionPayload({
      author_persona: 'foodie',
      mentioned_places: [
        {
          place_name: 'Jay Fai',
          context_snippet: 'Great chef special.',
          sentiment: 'positive',
          callouts: [{ type: 'dessert', text: 'mango sticky rice' }],
        },
      ],
    })

    const parsed = parseSocialExtraction(sanitized)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.mentioned_places[0].callouts).toEqual([])
  })
})

describe('getSocialExtractionOutputMode', () => {
  const originalModel = process.env.SOCIAL_EXTRACTION_MODEL
  const originalMode = process.env.SOCIAL_EXTRACTION_OUTPUT_MODE

  afterEach(() => {
    process.env.SOCIAL_EXTRACTION_MODEL = originalModel
    process.env.SOCIAL_EXTRACTION_OUTPUT_MODE = originalMode
  })

  it('defaults to native-json for Gemini models', () => {
    process.env.SOCIAL_EXTRACTION_MODEL = 'gemini-1.5-flash'
    delete process.env.SOCIAL_EXTRACTION_OUTPUT_MODE
    expect(getSocialExtractionOutputMode()).toBe('native-json')
  })

  it('auto-selects text-json-fallback for Gemma models', () => {
    process.env.SOCIAL_EXTRACTION_MODEL = 'gemma-3-27b-it'
    delete process.env.SOCIAL_EXTRACTION_OUTPUT_MODE
    expect(getSocialExtractionOutputMode()).toBe('text-json-fallback')
  })

  it('explicit native-json overrides Gemma auto-detection', () => {
    process.env.SOCIAL_EXTRACTION_MODEL = 'gemma-3-27b-it'
    process.env.SOCIAL_EXTRACTION_OUTPUT_MODE = 'native-json'
    expect(getSocialExtractionOutputMode()).toBe('native-json')
  })

  it('explicit text-json-fallback works for any model', () => {
    process.env.SOCIAL_EXTRACTION_MODEL = 'gemini-2.5-pro'
    process.env.SOCIAL_EXTRACTION_OUTPUT_MODE = 'text-json-fallback'
    expect(getSocialExtractionOutputMode()).toBe('text-json-fallback')
  })
})
