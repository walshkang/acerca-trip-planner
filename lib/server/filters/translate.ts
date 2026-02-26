import { normalizeTagList } from '@/lib/lists/tags'

type TranslateInput = {
  intent: string
  listId: string | null
}

export type TranslateIntentResult = {
  rawFilters: unknown
  model: string
  promptVersion: string
  usedFallback: boolean
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'food',
    'restaurant',
    'restaurants',
    'dinner',
    'lunch',
    'breakfast',
    'meal',
    'brunch',
    'eat',
    'eats',
  ],
  Coffee: ['coffee', 'cafe', 'cafes', 'espresso', 'latte'],
  Sights: [
    'sight',
    'sights',
    'landmark',
    'landmarks',
    'museum',
    'museums',
    'attraction',
    'attractions',
    'park',
    'parks',
  ],
  Shop: [
    'shop',
    'shops',
    'shopping',
    'store',
    'stores',
    'market',
    'markets',
    'boutique',
    'boutiques',
  ],
  Activity: [
    'activity',
    'activities',
    'hike',
    'hiking',
    'walk',
    'walking',
    'workout',
    'game',
    'games',
    'class',
    'classes',
  ],
  Drinks: [
    'drink',
    'drinks',
    'bar',
    'bars',
    'pub',
    'pubs',
    'cocktail',
    'cocktails',
    'wine',
    'nightlife',
  ],
}

const ENERGY_KEYWORDS: Record<string, string[]> = {
  Low: ['low', 'chill', 'calm', 'quiet', 'relaxed', 'easy', 'restful'],
  Medium: ['medium', 'moderate', 'balanced'],
  High: ['high', 'energetic', 'intense', 'active', 'party', 'adventure'],
}

const OPEN_NOW_TRUE_PATTERNS = [
  'open now',
  'currently open',
  'right now',
  'open late',
]
const OPEN_NOW_FALSE_PATTERNS = ['not open now', 'closed now', 'not currently open']

function includesWord(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i').test(
    haystack
  )
}

function extractHashtagTags(intent: string): string[] {
  const matches = intent.match(/#[a-zA-Z0-9_-]+/g) ?? []
  const raw = matches.map((value) => value.slice(1))
  return normalizeTagList(raw) ?? []
}

export function translateIntentToFiltersDeterministic({
  intent,
  listId,
}: TranslateInput): TranslateIntentResult {
  const lower = intent.toLowerCase()

  const categories: string[] = []
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => includesWord(lower, keyword))) {
      categories.push(category)
    }
  }

  const energy: string[] = []
  for (const [value, keywords] of Object.entries(ENERGY_KEYWORDS)) {
    if (keywords.some((keyword) => includesWord(lower, keyword))) {
      energy.push(value)
    }
  }

  let openNow: boolean | null = null
  if (OPEN_NOW_FALSE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    openNow = false
  } else if (OPEN_NOW_TRUE_PATTERNS.some((pattern) => lower.includes(pattern))) {
    openNow = true
  }

  const tags = listId ? extractHashtagTags(intent) : []

  return {
    rawFilters: {
      ...(categories.length > 0 ? { category: categories } : {}),
      ...(energy.length > 0 ? { energy } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(openNow !== null ? { open_now: openNow } : {}),
      ...(listId ? { within_list_id: listId } : {}),
    },
    model: 'deterministic-fallback',
    promptVersion: 'filter-translate-fallback-v1',
    usedFallback: true,
  }
}

async function translateWithOpenAI({
  intent,
  listId,
}: TranslateInput): Promise<TranslateIntentResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const model = process.env.FILTER_TRANSLATE_MODEL || 'gpt-4o-mini'
  const promptVersion = 'filter-translate-v1'

  const system = [
    'You translate user intent into strict filter JSON.',
    'Return ONLY a JSON object.',
    'Allowed keys: category, categories, type, types, energy, energies, tags, open_now, within_list_id.',
    'category/types are arrays of category labels or aliases.',
    'energy/energies are arrays of energy labels or aliases.',
    'open_now must be boolean when provided.',
    'tags are optional and list-scoped.',
    'If list_id is null, do not emit tags or within_list_id.',
    'No extra keys and no prose.',
  ].join('\n')

  const user = JSON.stringify({
    intent,
    list_id: listId,
    instruction: 'Translate intent to filter JSON only.',
  })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI error HTTP ${res.status}: ${text}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI response missing message content')
  }

  let rawFilters: unknown
  try {
    rawFilters = JSON.parse(content)
  } catch {
    throw new Error('OpenAI response was not valid JSON')
  }

  return {
    rawFilters,
    model,
    promptVersion,
    usedFallback: false,
  }
}

export async function translateIntentToFilters(
  input: TranslateInput
): Promise<TranslateIntentResult> {
  if (!process.env.OPENAI_API_KEY) {
    return translateIntentToFiltersDeterministic(input)
  }

  try {
    return await translateWithOpenAI(input)
  } catch {
    return translateIntentToFiltersDeterministic(input)
  }
}
