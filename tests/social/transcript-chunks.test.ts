import { describe, expect, it } from 'vitest'
import { chunkTranscript, mergeSocialExtractions } from '@/lib/social/transcript-chunks'
import type { SocialExtractionChunk } from '@/lib/social/extraction-contract'

describe('chunkTranscript', () => {
  it('returns single chunk for short text', () => {
    const t = 'Hello world. Short text.'
    expect(chunkTranscript(t, { maxChars: 1000, overlapChars: 50 })).toEqual([t])
  })

  it('returns empty array for empty string', () => {
    expect(chunkTranscript('', { maxChars: 1000, overlapChars: 50 })).toEqual([])
  })

  it('splits long text into multiple chunks under maxChars', () => {
    const sentence = 'Word '.repeat(30).trim() + '. '
    const text = sentence.repeat(20)
    const chunks = chunkTranscript(text, { maxChars: 200, overlapChars: 20 })
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(200)
    }
  })

  it('injects overlap between consecutive chunks', () => {
    const parts: string[] = []
    for (let i = 0; i < 15; i++) {
      parts.push(`Sentence ${i} has enough words to fill space.`)
    }
    const text = parts.join(' ')
    const chunks = chunkTranscript(text, { maxChars: 120, overlapChars: 40 })
    expect(chunks.length).toBeGreaterThan(1)
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1]!
      const cur = chunks[i]!
      const tail = prev.slice(-40)
      expect(cur.includes(tail.trim())).toBe(true)
    }
  })
})

describe('mergeSocialExtractions', () => {
  it('dedupes by place name and type and concatenates snippets', () => {
    const chunks: SocialExtractionChunk[] = [
      {
        author_persona: 'foodie',
        mentioned_places: [
          {
            place_name: 'Cafe X',
            place_type: 'cafe',
            context_snippet: 'First mention.',
            sentiment: 'positive',
          },
        ],
        contains_places: true,
      },
      {
        author_persona: 'design',
        mentioned_places: [
          {
            place_name: 'Cafe X',
            place_type: 'cafe',
            context_snippet: 'Second angle.',
            sentiment: 'positive',
          },
        ],
        contains_places: true,
      },
    ]
    const merged = mergeSocialExtractions(chunks)
    expect(merged.author_persona).toBe('foodie')
    expect(merged.mentioned_places).toHaveLength(1)
    expect(merged.mentioned_places[0]!.context_snippet).toBe(
      'First mention.\n\nSecond angle.'
    )
  })

  it('uses first chunk author_persona when present', () => {
    const chunks: SocialExtractionChunk[] = [
      {
        author_persona: 'local',
        mentioned_places: [],
        contains_places: false,
      },
      {
        author_persona: 'luxury',
        mentioned_places: [
          {
            place_name: 'Z',
            context_snippet: 'q',
            sentiment: 'neutral',
          },
        ],
        contains_places: true,
      },
    ]
    const merged = mergeSocialExtractions(chunks)
    expect(merged.author_persona).toBe('local')
    expect(merged.mentioned_places).toHaveLength(1)
  })
})
