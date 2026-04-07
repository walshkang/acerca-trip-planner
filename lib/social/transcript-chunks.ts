import {
  PERSONA_VALUES,
  type MentionedPlace,
  type MergedSocialExtraction,
  type Persona,
  type SocialExtractionChunk,
} from '@/lib/social/extraction-contract'

function splitSentences(text: string): string[] {
  const s = text.trim()
  if (!s) return []
  const raw = s.split(/(?<=[.!?])\s+/u)
  return raw.map((x) => x.trim()).filter(Boolean)
}

function mentionKey(m: { place_name: string; place_type?: string }): string {
  const name = m.place_name.trim().toLowerCase()
  const placeType = (m.place_type ?? '').trim().toLowerCase()
  return `${name}::${placeType}`
}

/**
 * Greedy pack sentences into chunks each at most `maxChars` (no overlap).
 */
function packSentences(sentences: string[], maxChars: number): string[] {
  if (sentences.length === 0) return []
  const chunks: string[] = []
  let i = 0
  while (i < sentences.length) {
    let buf = ''
    while (i < sentences.length) {
      const s = sentences[i]!
      const sep = buf.length > 0 ? 1 : 0
      if (buf.length + sep + s.length <= maxChars) {
        buf = buf.length > 0 ? `${buf} ${s}` : s
        i++
        continue
      }
      if (buf.length === 0) {
        if (s.length > maxChars) {
          chunks.push(s.slice(0, maxChars))
          sentences[i] = s.slice(maxChars)
          continue
        }
        buf = s
        i++
      }
      break
    }
    if (buf.length > 0) chunks.push(buf)
  }
  return chunks
}

/**
 * Split transcript into chunks at sentence boundaries, each at most `maxChars`,
 * with trailing overlap from the previous chunk prepended to the next chunk.
 */
export function chunkTranscript(
  text: string,
  opts: { maxChars: number; overlapChars: number }
): string[] {
  const { maxChars, overlapChars } = opts
  const t = text.trim()
  if (!t) return []

  const sentences = splitSentences(t)
  if (sentences.length === 0) return []

  const packed = packSentences(sentences, maxChars)
  if (packed.length <= 1) return packed

  const out: string[] = [packed[0]!]
  for (let i = 1; i < packed.length; i++) {
    const prev = out[i - 1]!
    const tail = prev.slice(-Math.min(overlapChars, prev.length)).trim()
    let merged = tail ? `${tail} ${packed[i]!}` : packed[i]!
    if (merged.length > maxChars) {
      merged = merged.slice(0, maxChars)
    }
    out.push(merged)
  }
  return out
}

const DEFAULT_PERSONA: Persona = 'local'

function firstDefinedPersona(chunks: SocialExtractionChunk[]): Persona {
  for (const c of chunks) {
    if (c.author_persona && PERSONA_VALUES.includes(c.author_persona)) {
      return c.author_persona
    }
  }
  return DEFAULT_PERSONA
}

/**
 * Dedupe mentions by name+type; concatenate `context_snippet` with blank lines.
 */
export function mergeSocialExtractions(chunks: SocialExtractionChunk[]): MergedSocialExtraction {
  const author_persona = firstDefinedPersona(chunks)
  const byKey = new Map<string, MentionedPlace>()

  for (const c of chunks) {
    for (const m of c.mentioned_places) {
      const key = mentionKey(m)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, { ...m })
        continue
      }
      const mergedSnippet = `${existing.context_snippet}\n\n${m.context_snippet}`.slice(0, 4000)
      byKey.set(key, {
        ...existing,
        context_snippet: mergedSnippet,
        place_type: existing.place_type ?? m.place_type,
        sentiment: existing.sentiment,
      })
    }
  }

  return {
    author_persona,
    mentioned_places: Array.from(byKey.values()),
  }
}

export function getChunkingConfigFromEnv(): { maxChars: number; overlapChars: number } {
  const maxChars = Number.parseInt(process.env.SOCIAL_CHUNK_MAX_CHARS ?? '8000', 10)
  const overlapChars = Number.parseInt(process.env.SOCIAL_CHUNK_OVERLAP ?? '200', 10)
  return {
    maxChars: Number.isFinite(maxChars) && maxChars > 200 ? maxChars : 8000,
    overlapChars: Number.isFinite(overlapChars) && overlapChars >= 0 ? overlapChars : 200,
  }
}
