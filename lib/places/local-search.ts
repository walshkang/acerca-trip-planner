import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'

export function resolveCategoryMatch(query: string): string | null {
  const normalized = query.toLowerCase()
  for (const value of CATEGORY_ENUM_VALUES) {
    const lower = value.toLowerCase()
    if (normalized === lower || normalized === `${lower}s`) {
      return value
    }
  }
  return null
}

export function normalizeLocalSearchQuery(input: string): string | null {
  let tag = input.trim().toLowerCase()
  if (!tag) return null
  tag = tag.replace(/[\s_]+/g, '-')
  tag = tag.replace(/[^a-z0-9-]/g, '')
  tag = tag.replace(/-+/g, '-')
  tag = tag.replace(/^-+/, '').replace(/-+$/, '')
  return tag.length ? tag : null
}

export function rankLocalSearchMatch(
  name: string,
  address: string | null,
  category: string,
  query: string,
  categoryMatch: string | null,
  normalizedQuery: string | null,
  nameNormalized: string | null,
  addressNormalized: string | null
): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  if (normalizedQuery && nameNormalized?.includes(normalizedQuery)) return 3
  if (categoryMatch && category === categoryMatch) return 4
  if (address && address.toLowerCase().includes(q)) return 5
  if (normalizedQuery && addressNormalized?.includes(normalizedQuery)) return 6
  return 7
}
