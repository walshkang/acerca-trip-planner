const EXTENDED_PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u
const EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}/u
const EMOJI_RE = /\p{Emoji}/u
const REGIONAL_INDICATOR_RE = /\p{Regional_Indicator}/u
const KEYCAP_SEQUENCE_RE = /^[#*0-9]\uFE0F?\u20E3$/u
const VARIATION_SELECTOR_RE = /[\uFE0E\uFE0F]/gu
const VARIATION_SELECTOR_16 = '\uFE0F'
const ZERO_WIDTH_JOINER = '\u200D'

const RGI_EMOJI_RE: RegExp | null = (() => {
  try {
    return new RegExp('\\p{RGI_Emoji}', 'v')
  } catch {
    return null
  }
})()

function segmentIntoGraphemes(value: string): string[] {
  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity?: 'grapheme' }
      ) => {
        segment: (input: string) => Iterable<{ segment: string }>
      }
    }
  ).Segmenter

  if (typeof SegmenterCtor === 'function') {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(value), ({ segment }) => segment)
  }

  return Array.from(value)
}

function isEmojiGrapheme(grapheme: string): boolean {
  if (!grapheme) return false
  if (EXTENDED_PICTOGRAPHIC_RE.test(grapheme)) return true
  if (EMOJI_PRESENTATION_RE.test(grapheme)) return true
  if (KEYCAP_SEQUENCE_RE.test(grapheme)) return true
  if (
    grapheme.includes(VARIATION_SELECTOR_16) &&
    grapheme.includes(ZERO_WIDTH_JOINER) &&
    EMOJI_RE.test(grapheme)
  ) {
    return true
  }
  const regionalIndicators = Array.from(
    grapheme.matchAll(/\p{Regional_Indicator}/gu),
    (match) => match[0]
  )
  if (regionalIndicators.length >= 2 && REGIONAL_INDICATOR_RE.test(grapheme)) {
    return true
  }
  return false
}

function findFirstEmojiByGrapheme(value: string): string | null {
  for (const grapheme of segmentIntoGraphemes(value)) {
    if (isEmojiGrapheme(grapheme)) {
      return grapheme
    }
  }
  return null
}

export function emojiComparisonKey(value: string): string {
  return value.replace(VARIATION_SELECTOR_RE, '')
}

export function normalizeEmojiInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed.length) return null

  if (RGI_EMOJI_RE) {
    const match = trimmed.match(RGI_EMOJI_RE)
    return match?.[0] ?? null
  }

  return findFirstEmojiByGrapheme(trimmed)
}
