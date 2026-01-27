import { describe, expect, it } from 'vitest'
import {
  WIKI_CURATED_VERSION,
  assertValidWikiCuratedData,
} from '@/lib/enrichment/wikiCurated'
import { extractPrimaryWikidataFactPairs } from '@/lib/enrichment/curation'

describe('wikiCurated schema', () => {
  it('accepts a valid curated object', () => {
    const v = {
      version: WIKI_CURATED_VERSION,
      wikipedia_title: 'Golden Gate Bridge',
      wikidata_qid: 'Q123',
      summary: 'A bridge.',
      thumbnail_url: 'https://upload.wikimedia.org/example.jpg',
      primary_fact_pairs: [{ label: 'Founded', value: '1937' }],
    }
    expect(() => assertValidWikiCuratedData(v)).not.toThrow()
  })

  it('rejects an invalid curated object', () => {
    const v = { version: 999, primary_fact_pairs: 'nope' }
    expect(() => assertValidWikiCuratedData(v)).toThrow()
  })
})

describe('extractPrimaryWikidataFactPairs', () => {
  it('extracts a stable, ordered subset of facts', () => {
    const entity = {
      claims: {
        P571: [
          {
            mainsnak: {
              datavalue: { value: { time: '+1937-05-27T00:00:00Z' } },
            },
          },
        ],
        P84: [
          {
            mainsnak: {
              datavalue: { value: { id: 'Q42' } },
            },
          },
        ],
        P2044: [
          {
            mainsnak: {
              datavalue: {
                value: { amount: '+67', unit: 'http://www.wikidata.org/entity/Q11573' },
              },
            },
          },
        ],
        P856: [
          {
            mainsnak: {
              datavalue: { value: 'https://example.com' },
            },
          },
        ],
      },
    }

    const withoutLabels = extractPrimaryWikidataFactPairs({ entity, labelsByQid: {} })
    expect(withoutLabels.referencedQids).toEqual(['Q42'])
    expect(withoutLabels.pairs.map((p) => p.label)).toEqual([
      'Founded',
      'Architect',
      'Elevation',
      'Website',
    ])
    expect(withoutLabels.pairs[1]?.value).toBe('Q42')

    const withLabels = extractPrimaryWikidataFactPairs({
      entity,
      labelsByQid: { Q42: 'Douglas Adams' },
    })
    expect(withLabels.pairs[1]?.value).toBe('Douglas Adams')
    expect(withLabels.pairs[2]?.value).toBe('67 m')
  })
})

