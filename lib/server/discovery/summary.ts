import type { DiscoverySuggestion, DiscoverySummary } from '@/lib/discovery/contract'
import type { CanonicalServerFilters } from '@/lib/filters/schema'

type BuildDiscoverySummaryInput = {
  includeSummary: boolean
  intent: string
  filters: CanonicalServerFilters | null
  suggestions: DiscoverySuggestion[]
}

export function buildDiscoverySummary(
  input: BuildDiscoverySummaryInput
): DiscoverySummary | null {
  if (!input.includeSummary) {
    return null
  }

  const topNames = input.suggestions
    .map((item) => item.name?.trim() ?? '')
    .filter((value) => value.length > 0)
    .slice(0, 3)

  let text = ''
  if (topNames.length === 0) {
    text = `No suggestions matched "${input.intent}".`
  } else if (topNames.length === 1) {
    text = `Top suggestion for "${input.intent}" is ${topNames[0]}.`
  } else {
    text = `Top suggestions for "${input.intent}" are ${topNames.join(', ')}.`
  }

  if (input.filters?.category.length) {
    text += ` Categories: ${input.filters.category.join(', ')}.`
  }
  if (input.filters?.open_now !== null) {
    text += input.filters.open_now
      ? ' Open-now filter is active.'
      : ' Closed-now filter is active.'
  }

  return {
    text,
    model: 'deterministic-fallback',
    promptVersion: 'discovery-summary-fallback-v1',
    usedFallback: true,
  }
}
