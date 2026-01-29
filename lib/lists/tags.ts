const DEFAULT_TAG_LIMIT = 50
const DEFAULT_MAX_TAG_LENGTH = 32

export type TagNormalizeOptions = {
  maxCount?: number
  maxLength?: number
}

export function normalizeTag(
  input: string,
  maxLength: number = DEFAULT_MAX_TAG_LENGTH
): string | null {
  if (typeof input !== 'string') return null
  let tag = input.trim().toLowerCase()
  if (!tag) return null

  tag = tag.replace(/[\s_]+/g, '-')
  tag = tag.replace(/[^a-z0-9-]/g, '')
  tag = tag.replace(/-+/g, '-')
  tag = tag.replace(/^-+/, '').replace(/-+$/, '')

  if (!tag) return null

  if (tag.length > maxLength) {
    tag = tag.slice(0, maxLength)
    tag = tag.replace(/-+$/, '')
  }

  return tag.length ? tag : null
}

export function normalizeTagList(
  input: unknown,
  options: TagNormalizeOptions = {}
): string[] | null {
  const maxCount = options.maxCount ?? DEFAULT_TAG_LIMIT
  const maxLength = options.maxLength ?? DEFAULT_MAX_TAG_LENGTH
  let rawTags: unknown[]

  if (Array.isArray(input)) {
    rawTags = input
  } else if (typeof input === 'string') {
    rawTags = input.split(',')
  } else {
    return null
  }

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of rawTags) {
    if (typeof raw !== 'string') continue
    const tag = normalizeTag(raw, maxLength)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
    if (normalized.length >= maxCount) break
  }

  return normalized
}

export function distinctTagsFromItems(
  items: Array<{ tags?: string[] | null }>,
  options: TagNormalizeOptions = {}
): string[] {
  const maxLength = options.maxLength ?? DEFAULT_MAX_TAG_LENGTH
  const seen = new Set<string>()

  for (const item of items) {
    const tags = item.tags ?? []
    for (const raw of tags) {
      if (typeof raw !== 'string') continue
      const tag = normalizeTag(raw, maxLength)
      if (!tag || seen.has(tag)) continue
      seen.add(tag)
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b))
}
