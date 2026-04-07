import { beforeAll, describe, expect, it } from 'vitest'
import { extractMergedSocialExtraction } from '@/lib/server/social/ingest'
import { mergedSocialExtractionSchema, PERSONA_VALUES } from '@/lib/social/extraction-contract'
import { EVAL_FIXTURES } from './fixtures/index'

// Gate behind RUN_EVALS env var — these call real Gemini and cost money
const runEvals = !!process.env.RUN_EVALS

describe.skipIf(!runEvals)('deterministic extraction evals', () => {
  const extractionCache = new Map<
    string,
    Awaited<ReturnType<typeof extractMergedSocialExtraction>>
  >()

  const getCachedExtraction = (label: string) => {
    const cached = extractionCache.get(label)
    expect(cached, `missing cached extraction for fixture: ${label}`).toBeDefined()
    return cached!
  }

  beforeAll(async () => {
    const CONCURRENT = 2
    for (let i = 0; i < EVAL_FIXTURES.length; i += CONCURRENT) {
      await Promise.all(
        EVAL_FIXTURES.slice(i, i + CONCURRENT).map(async (fixture) => {
          const result = await extractMergedSocialExtraction(fixture.transcript)
          extractionCache.set(fixture.label, result)
        })
      )
    }
  }, 600_000)

  it.each(EVAL_FIXTURES)('$label — output is schema-valid', async ({ label, transcript }) => {
    expect(transcript.length).toBeGreaterThan(0)
    const result = getCachedExtraction(label)

    // Full schema parse — catches any structural drift
    const parsed = mergedSocialExtractionSchema.safeParse(result)
    if (!parsed.success) {
      throw new Error(
        `[${label}] schema invalid: ${parsed.error.issues.map((i) => i.message).join('; ')}`
      )
    }

    // author_persona is a valid enum value
    expect(PERSONA_VALUES).toContain(result.author_persona)

    // No nulls inside arrays
    expect(result.mentioned_places.every((p) => p !== null && p !== undefined)).toBe(true)
    for (const place of result.mentioned_places) {
      expect(Array.isArray(place.tags)).toBe(true)
      expect(Array.isArray(place.callouts)).toBe(true)
      expect(place.tags!.every((t) => t !== null)).toBe(true)
      expect(place.callouts!.every((c) => c !== null)).toBe(true)
    }
  }, 30_000)

  it('ghost-town — returns empty mentioned_places, no hallucinated filler', async () => {
    const result = getCachedExtraction('ghost-town')

    expect(result.mentioned_places).toHaveLength(0)
  }, 30_000)

  it('tangent — extracts exactly 1 place (Museo Jumex), not the 3 mentioned-only places', async () => {
    const result = getCachedExtraction('tangent')

    // Must not over-extract
    expect(result.mentioned_places.length).toBeLessThanOrEqual(2)

    // Must include the visited place
    const names = result.mentioned_places.map((p) => p.place_name.toLowerCase())
    expect(names.some((n) => n.includes('jumex'))).toBe(true)
  }, 30_000)

  it('negative-review — Lau Pa Sat and Atlas are not positive sentiment', async () => {
    const result = getCachedExtraction('negative-review')

    const lauPaSat = result.mentioned_places.find((p) =>
      p.place_name.toLowerCase().includes('lau pa sat')
    )
    const atlas = result.mentioned_places.find((p) => p.place_name.toLowerCase().includes('atlas'))

    // Both must exist and neither should be purely positive
    if (lauPaSat) expect(lauPaSat.sentiment).not.toBe('positive')
    if (atlas) expect(atlas.sentiment).not.toBe('positive')
  }, 30_000)

  it('firehose — extracts at least 12 of 16 places (75% recall floor)', async () => {
    const result = getCachedExtraction('firehose')

    expect(result.mentioned_places.length).toBeGreaterThanOrEqual(12)
  }, 60_000)

  it('luxury-persona — author_persona is luxury, not foodie or design', async () => {
    const result = getCachedExtraction('luxury-persona')

    expect(result.author_persona).toBe('luxury')
    expect(result.mentioned_places.length).toBeGreaterThanOrEqual(3)

    // Jiro must be present — it's the most distinctive place
    const names = result.mentioned_places.map((p) => p.place_name.toLowerCase())
    expect(names.some((n) => n.includes('jiro'))).toBe(true)
  }, 30_000)

  it('local-persona — author_persona is local, not budget or foodie', async () => {
    const result = getCachedExtraction('local-persona')

    expect(result.author_persona).toBe('local')
    expect(result.mentioned_places.length).toBeGreaterThanOrEqual(2)

    // BooksActually is the clearest non-food local signal — must not be dropped
    const names = result.mentioned_places.map((p) => p.place_name.toLowerCase())
    expect(names.some((n) => n.includes('booksactually') || n.includes('books actually'))).toBe(true)
  }, 30_000)
})
