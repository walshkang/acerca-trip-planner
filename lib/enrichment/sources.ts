// Google Places + Wikipedia/Wikidata fetching (server-side)
// This module is intentionally deterministic: explicit inputs, bounded retries, explicit timeouts.

export interface GooglePlacesResult {
  place_id: string
  name: string
  formatted_address?: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  types?: string[]
  website?: string
  url?: string
  [key: string]: any // Preserve raw payload (Google adds fields over time).
}

export interface GooglePlacesTextCandidate {
  place_id: string
  name?: string
  formatted_address?: string
  geometry?: {
    location?: {
      lat: number
      lng: number
    }
  }
  [key: string]: any
}

export interface WikipediaGeoSearchItem {
  pageid: number
  title: string
  lat: number
  lon: number
  dist: number
  primary?: string
}

interface WikipediaGeoSearchResponseV2 {
  batchcomplete?: boolean | string
  query?: {
    geosearch?: WikipediaGeoSearchItem[]
  }
}

interface WikipediaPagePropsResponseV2 {
  batchcomplete?: boolean | string
  query?: {
    pages?: Array<{
      pageid: number
      title: string
      pageprops?: {
        wikibase_item?: string
      }
    }>
  }
}

export interface WikidataEntityDataResponse {
  entities: Record<string, any>
  [key: string]: any
}

interface WikipediaSummaryResponseV2 {
  batchcomplete?: boolean | string
  query?: {
    pages?: Array<{
      pageid: number
      title: string
      extract?: string
      thumbnail?: { source?: string; width?: number; height?: number }
    }>
  }
}

function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
}

function tokenOverlapScore(a: string, b: string): number {
  const at = normalizeTokens(a)
  const bt = normalizeTokens(b)
  if (at.length === 0 || bt.length === 0) return 0
  const aset = new Set(at)
  let overlap = 0
  for (const t of bt) {
    if (aset.has(t)) overlap++
  }
  // Deterministic, bounded 0..1-ish score (prefers higher overlap and shorter titles).
  return overlap / Math.max(at.length, bt.length)
}

/**
 * Deterministically select the "best" Wikipedia match.
 * Sort key: distance asc, nameScore desc, pageid asc.
 */
export function selectBestWikipediaMatch(input: {
  placeName: string
  candidates: WikipediaGeoSearchItem[]
}): WikipediaGeoSearchItem | null {
  const { placeName, candidates } = input
  if (!candidates.length) return null

  const scored = candidates.map((c) => ({
    c,
    nameScore: tokenOverlapScore(placeName, c.title),
  }))

  scored.sort((a, b) => {
    if (a.c.dist !== b.c.dist) return a.c.dist - b.c.dist
    if (a.nameScore !== b.nameScore) return b.nameScore - a.nameScore
    return a.c.pageid - b.c.pageid
  })

  return scored[0]?.c ?? null
}

export class SourceFetchError extends Error {
  readonly code:
    | 'missing_env'
    | 'timeout'
    | 'network'
    | 'http_error'
    | 'invalid_json'
    | 'unexpected_shape'
  readonly status: number | null

  constructor(
    code: SourceFetchError['code'],
    message: string,
    opts?: { status?: number | null; cause?: unknown }
  ) {
    super(message)
    this.name = 'SourceFetchError'
    this.code = code
    this.status = opts?.status ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any).cause = opts?.cause
  }
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const DEFAULT_TIMEOUT_MS = envInt('ENRICHMENT_HTTP_TIMEOUT_MS', 8000)
const DEFAULT_MAX_RETRIES = envInt('ENRICHMENT_HTTP_MAX_RETRIES', 2)
const WIKIPEDIA_GEOSEARCH_RADIUS_M = envInt('WIKIPEDIA_GEOSEARCH_RADIUS_M', 3000)
const WIKIPEDIA_GEOSEARCH_LIMIT = envInt('WIKIPEDIA_GEOSEARCH_LIMIT', 10)
const WIKIPEDIA_USER_AGENT =
  process.env.WIKIPEDIA_USER_AGENT || 'acerca-trip-planner/0.1 (server)'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function fetchJson<T>(
  url: string,
  opts?: {
    timeoutMs?: number
    maxRetries?: number
    headers?: Record<string, string>
  }
): Promise<{ status: number; data: T }> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES

  let lastErr: unknown = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          ...(opts?.headers ?? {}),
        },
      })

      const status = res.status

      if (!res.ok) {
        if (shouldRetryStatus(status) && attempt < maxRetries) {
          await sleep(250 * Math.pow(2, attempt))
          continue
        }
        throw new SourceFetchError(
          'http_error',
          `HTTP ${status} for ${url}`,
          { status }
        )
      }

      let data: T
      try {
        data = (await res.json()) as T
      } catch (e) {
        throw new SourceFetchError('invalid_json', `Invalid JSON for ${url}`, {
          status,
          cause: e,
        })
      }

      return { status, data }
    } catch (e) {
      lastErr = e

      if (e instanceof SourceFetchError) {
        // Only the retriable status path is handled above; everything else is terminal.
        throw e
      }

      if (e instanceof DOMException && e.name === 'AbortError') {
        if (attempt < maxRetries) {
          await sleep(250 * Math.pow(2, attempt))
          continue
        }
        throw new SourceFetchError('timeout', `Timeout after ${timeoutMs}ms for ${url}`, {
          status: null,
          cause: e,
        })
      }

      if (attempt < maxRetries) {
        await sleep(250 * Math.pow(2, attempt))
        continue
      }

      throw new SourceFetchError('network', `Network error for ${url}`, {
        status: null,
        cause: lastErr,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  // Unreachable; loop always returns or throws.
  throw new SourceFetchError('network', `Network error for ${url}`, {
    status: null,
    cause: lastErr,
  })
}

/**
 * Fetch place details from Google Places API (Places Details).
 * Uses an explicit field list to keep payload stable and costs bounded.
 */
export async function fetchGooglePlace(placeId: string): Promise<GooglePlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new SourceFetchError(
      'missing_env',
      'GOOGLE_PLACES_API_KEY is not set',
      { status: null }
    )
  }

  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'opening_hours',
    'types',
    'website',
    'url',
  ].join(',')

  const u = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  u.searchParams.set('place_id', placeId)
  u.searchParams.set('fields', fields)
  u.searchParams.set('key', apiKey)

  const { data } = await fetchJson<{
    status: string
    result?: GooglePlacesResult
    error_message?: string
  }>(u.toString())

  if (data.status !== 'OK' || !data.result) {
    throw new SourceFetchError(
      'http_error',
      `Google Places error status=${data.status}${data.error_message ? ` message=${data.error_message}` : ''}`,
      { status: 200 }
    )
  }

  return data.result
}

type GooglePlacesFindPlaceResponse = {
  status: string
  candidates?: GooglePlacesTextCandidate[]
  error_message?: string
}

type GooglePlacesLocationBias = {
  lat: number
  lng: number
  radiusMeters: number
}

async function fetchFindPlaceCandidates(
  input: string,
  fields: string,
  options?: { locationBias?: GooglePlacesLocationBias }
): Promise<{
  status: string
  candidates: GooglePlacesTextCandidate[]
  errorMessage?: string
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new SourceFetchError(
      'missing_env',
      'GOOGLE_PLACES_API_KEY is not set',
      { status: null }
    )
  }

  const u = new URL(
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
  )
  u.searchParams.set('input', input)
  u.searchParams.set('inputtype', 'textquery')
  u.searchParams.set('fields', fields)
  u.searchParams.set('key', apiKey)
  if (options?.locationBias) {
    const { lat, lng, radiusMeters } = options.locationBias
    u.searchParams.set(
      'locationbias',
      `circle:${Math.round(radiusMeters)}@${lat},${lng}`
    )
  }

  const { data } = await fetchJson<GooglePlacesFindPlaceResponse>(u.toString())

  return {
    status: data.status,
    candidates: data.candidates ?? [],
    errorMessage: data.error_message,
  }
}

/**
 * Resolve a Google Place ID deterministically from a free-text query.
 * Uses Find Place From Text and selects the first candidate returned.
 */
export async function findGooglePlaceIdFromText(input: string): Promise<{
  placeId: string
  candidates: GooglePlacesTextCandidate[]
}> {
  const fields = ['place_id', 'name', 'formatted_address'].join(',')
  const { status, candidates, errorMessage } = await fetchFindPlaceCandidates(
    input,
    fields
  )

  if (status !== 'OK' || !candidates.length) {
    throw new SourceFetchError(
      'http_error',
      `Google FindPlace error status=${status}${errorMessage ? ` message=${errorMessage}` : ''}`,
      { status: 200 }
    )
  }

  const first = candidates[0]
  if (!first?.place_id) {
    throw new SourceFetchError(
      'unexpected_shape',
      'Google FindPlace response missing place_id',
      { status: 200 }
    )
  }

  return { placeId: first.place_id, candidates }
}

/**
 * Return lightweight Find Place candidates for search results.
 * Returns an empty list for ZERO_RESULTS.
 */
export async function searchGooglePlaces(
  input: string,
  options?: { locationBias?: GooglePlacesLocationBias }
): Promise<GooglePlacesTextCandidate[]> {
  const fields = ['place_id', 'name', 'formatted_address', 'geometry'].join(',')
  const { status, candidates, errorMessage } = await fetchFindPlaceCandidates(
    input,
    fields,
    options
  )

  if (status === 'ZERO_RESULTS') return []

  if (status !== 'OK') {
    throw new SourceFetchError(
      'http_error',
      `Google FindPlace error status=${status}${errorMessage ? ` message=${errorMessage}` : ''}`,
      { status: 200 }
    )
  }

  return candidates.filter((c) => typeof c.place_id === 'string' && c.place_id)
}

/**
 * Fetch nearby Wikipedia pages via GeoSearch.
 * https://www.mediawiki.org/wiki/Extension:GeoData
 */
export async function fetchWikipediaPages(
  lat: number,
  lng: number
): Promise<WikipediaGeoSearchItem[]> {
  const u = new URL('https://en.wikipedia.org/w/api.php')
  // Keep query param insertion deterministic (stable order).
  u.searchParams.set('action', 'query')
  u.searchParams.set('list', 'geosearch')
  u.searchParams.set('gscoord', `${lat}|${lng}`)
  u.searchParams.set('gsradius', String(WIKIPEDIA_GEOSEARCH_RADIUS_M))
  u.searchParams.set('gslimit', String(WIKIPEDIA_GEOSEARCH_LIMIT))
  u.searchParams.set('format', 'json')
  u.searchParams.set('formatversion', '2')

  const { data } = await fetchJson<WikipediaGeoSearchResponseV2>(u.toString(), {
    headers: {
      'user-agent': WIKIPEDIA_USER_AGENT,
    },
  })

  const items = data.query?.geosearch
  if (!items) return []

  // Normalize shape defensively; keep only the fields we claim to return.
  return items
    .filter((it) => typeof it?.pageid === 'number' && typeof it?.title === 'string')
    .map((it) => ({
      pageid: it.pageid,
      title: it.title,
      lat: Number(it.lat),
      lon: Number(it.lon),
      dist: Number(it.dist),
      primary: it.primary,
    }))
}

/**
 * Fetch structured data from Wikidata for a given Wikipedia title.
 * This is a deterministic two-step resolution:
 * 1) Wikipedia title -> Wikidata QID (pageprops.wikibase_item)
 * 2) Wikidata QID -> entity JSON (Special:EntityData)
 */
export async function fetchWikidataData(wikipediaTitle: string): Promise<{
  wikipediaTitle: string
  qid: string | null
  entity: any | null
  raw: {
    wikipediaPageProps: WikipediaPagePropsResponseV2 | null
    wikidataEntity: WikidataEntityDataResponse | null
  }
}> {
  const wikiU = new URL('https://en.wikipedia.org/w/api.php')
  wikiU.searchParams.set('action', 'query')
  wikiU.searchParams.set('prop', 'pageprops')
  wikiU.searchParams.set('ppprop', 'wikibase_item')
  wikiU.searchParams.set('titles', wikipediaTitle)
  wikiU.searchParams.set('format', 'json')
  wikiU.searchParams.set('formatversion', '2')

  const { data: wikipediaPageProps } = await fetchJson<WikipediaPagePropsResponseV2>(
    wikiU.toString(),
    {
      headers: {
        'user-agent': WIKIPEDIA_USER_AGENT,
      },
    }
  )

  const page = wikipediaPageProps.query?.pages?.[0]
  const qid = page?.pageprops?.wikibase_item ?? null
  if (!qid) {
    return {
      wikipediaTitle,
      qid: null,
      entity: null,
      raw: { wikipediaPageProps, wikidataEntity: null },
    }
  }

  const wdU = new URL(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)
  const { data: wikidataEntity } = await fetchJson<WikidataEntityDataResponse>(
    wdU.toString(),
    {
      headers: {
        'user-agent': WIKIPEDIA_USER_AGENT,
        accept: 'application/json',
      },
    }
  )

  const entity = wikidataEntity?.entities?.[qid] ?? null

  return {
    wikipediaTitle,
    qid,
    entity,
    raw: { wikipediaPageProps, wikidataEntity },
  }
}

/**
 * Fetch a short, UI-safe Wikipedia summary + thumbnail for a title.
 * Uses `w/api.php` to avoid REST variations and keep parameters explicit.
 */
export async function fetchWikipediaSummary(
  wikipediaTitle: string,
  opts?: { maxChars?: number; thumbSize?: number }
): Promise<{
  wikipediaTitle: string
  pageid: number | null
  summary: string | null
  thumbnail_url: string | null
  raw: WikipediaSummaryResponseV2 | null
}> {
  const maxChars = opts?.maxChars ?? 900
  const thumbSize = opts?.thumbSize ?? 400

  const u = new URL('https://en.wikipedia.org/w/api.php')
  u.searchParams.set('action', 'query')
  u.searchParams.set('prop', 'extracts|pageimages')
  u.searchParams.set('exintro', '1')
  u.searchParams.set('explaintext', '1')
  u.searchParams.set('exchars', String(maxChars))
  u.searchParams.set('piprop', 'thumbnail')
  u.searchParams.set('pithumbsize', String(thumbSize))
  u.searchParams.set('titles', wikipediaTitle)
  u.searchParams.set('format', 'json')
  u.searchParams.set('formatversion', '2')

  const { data: raw } = await fetchJson<WikipediaSummaryResponseV2>(u.toString(), {
    headers: { 'user-agent': WIKIPEDIA_USER_AGENT },
  })

  const page = raw.query?.pages?.[0] ?? null
  const summary =
    typeof page?.extract === 'string' && page.extract.trim()
      ? page.extract.trim()
      : null
  const thumbnail_url =
    typeof page?.thumbnail?.source === 'string' && page.thumbnail.source.trim()
      ? page.thumbnail.source.trim()
      : null

  return {
    wikipediaTitle,
    pageid: typeof page?.pageid === 'number' ? page.pageid : null,
    summary,
    thumbnail_url,
    raw,
  }
}

/**
 * Deterministically fetch English labels for a list of Wikidata QIDs.
 */
export async function fetchWikidataLabels(qids: string[]): Promise<Record<string, string>> {
  const ids = Array.from(
    new Set(
      qids
        .filter((q) => typeof q === 'string')
        .map((q) => q.trim())
        .filter((q) => /^Q[1-9]\d*$/.test(q))
    )
  ).sort()

  if (!ids.length) return {}

  const u = new URL('https://www.wikidata.org/w/api.php')
  u.searchParams.set('action', 'wbgetentities')
  u.searchParams.set('props', 'labels')
  u.searchParams.set('languages', 'en')
  u.searchParams.set('ids', ids.join('|'))
  u.searchParams.set('format', 'json')
  u.searchParams.set('formatversion', '2')

  const { data } = await fetchJson<{ entities?: Record<string, any> }>(u.toString(), {
    headers: { 'user-agent': WIKIPEDIA_USER_AGENT },
  })

  const out: Record<string, string> = {}
  const entities = data?.entities ?? {}
  for (const qid of Object.keys(entities)) {
    const label = entities?.[qid]?.labels?.en?.value
    if (typeof label === 'string' && label.trim()) out[qid] = label.trim()
  }
  return out
}
