export const WIKI_CURATED_VERSION = 1 as const

export type WikiCuratedFactPair = {
  label: string
  value: string
}

export type WikiCuratedData = {
  version: typeof WIKI_CURATED_VERSION
  wikipedia_title: string | null
  wikidata_qid: string | null
  summary: string | null
  thumbnail_url: string | null
  primary_fact_pairs: WikiCuratedFactPair[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === 'string'
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\/\S+$/i.test(v)
}

export function assertValidWikiCuratedData(v: unknown): asserts v is WikiCuratedData {
  if (!isRecord(v)) throw new Error('wikipediaCurated must be an object')

  const version = v.version
  if (version !== WIKI_CURATED_VERSION) {
    throw new Error(`wikipediaCurated.version must be ${WIKI_CURATED_VERSION}`)
  }

  if (!isNullableString(v.wikipedia_title)) {
    throw new Error('wikipediaCurated.wikipedia_title must be string|null')
  }
  if (!isNullableString(v.wikidata_qid)) {
    throw new Error('wikipediaCurated.wikidata_qid must be string|null')
  }
  if (!isNullableString(v.summary)) {
    throw new Error('wikipediaCurated.summary must be string|null')
  }

  if (!isNullableString(v.thumbnail_url)) {
    throw new Error('wikipediaCurated.thumbnail_url must be string|null')
  }
  if (typeof v.thumbnail_url === 'string' && !isHttpUrl(v.thumbnail_url)) {
    throw new Error('wikipediaCurated.thumbnail_url must be an http(s) URL')
  }

  if (!Array.isArray(v.primary_fact_pairs)) {
    throw new Error('wikipediaCurated.primary_fact_pairs must be an array')
  }
  if (v.primary_fact_pairs.length > 12) {
    throw new Error('wikipediaCurated.primary_fact_pairs must have <= 12 items')
  }

  for (const it of v.primary_fact_pairs) {
    if (!isRecord(it)) throw new Error('Fact pair must be an object')
    if (typeof it.label !== 'string' || typeof it.value !== 'string') {
      throw new Error('Fact pair label/value must be strings')
    }
    if (!it.label.trim() || !it.value.trim()) {
      throw new Error('Fact pair label/value must be non-empty')
    }
    if (it.label.length > 80) throw new Error('Fact pair label too long')
    if (it.value.length > 300) throw new Error('Fact pair value too long')
  }

  if (typeof v.summary === 'string' && v.summary.length > 1600) {
    throw new Error('wikipediaCurated.summary too long')
  }
}

