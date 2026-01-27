import type { WikiCuratedFactPair } from '@/lib/enrichment/wikiCurated'

function firstClaim(entity: any, pid: string): any | null {
  const claims = entity?.claims?.[pid]
  if (!Array.isArray(claims) || !claims.length) return null
  return claims[0] ?? null
}

function snakValue(claim: any): any | null {
  return claim?.mainsnak?.datavalue?.value ?? null
}

function formatWikidataTime(v: any): string | null {
  const t = v?.time
  if (typeof t !== 'string') return null
  const m = t.match(/^[+-](\d{1,4})-(\d{2})-(\d{2})T/)
  if (!m) return null
  const year = m[1]
  if (!year) return null
  return year
}

function formatWikidataQuantity(v: any): { value: string; unitQid: string | null } | null {
  const amount = v?.amount
  if (typeof amount !== 'string') return null
  const n = Number(amount.replace(/^\+/, ''))
  if (!Number.isFinite(n)) return null

  const unit = typeof v?.unit === 'string' ? v.unit : null
  const unitQid = unit?.match(/\/entity\/(Q[1-9]\d*)$/)?.[1] ?? null
  return { value: String(n), unitQid }
}

export function extractPrimaryWikidataFactPairs(input: {
  entity: any | null
  labelsByQid?: Record<string, string>
}): { pairs: WikiCuratedFactPair[]; referencedQids: string[] } {
  const entity = input.entity
  const labelsByQid = input.labelsByQid ?? {}

  if (!entity) return { pairs: [], referencedQids: [] }

  const referencedQids: string[] = []
  const pairs: WikiCuratedFactPair[] = []

  // Founded / inception (P571)
  {
    const c = firstClaim(entity, 'P571')
    const v = snakValue(c)
    const year = formatWikidataTime(v)
    if (year) pairs.push({ label: 'Founded', value: year })
  }

  // Architect (P84) - entity id (Q...)
  {
    const c = firstClaim(entity, 'P84')
    const v = snakValue(c)
    const qid = typeof v?.id === 'string' ? v.id : null
    if (qid && /^Q[1-9]\d*$/.test(qid)) {
      referencedQids.push(qid)
      pairs.push({ label: 'Architect', value: labelsByQid[qid] ?? qid })
    }
  }

  // Elevation above sea level (P2044) - quantity, prefer meters (Q11573)
  {
    const c = firstClaim(entity, 'P2044')
    const v = snakValue(c)
    const q = formatWikidataQuantity(v)
    if (q?.value) {
      const unit =
        q.unitQid === 'Q11573' ? ' m' : q.unitQid ? ` (${q.unitQid})` : ''
      pairs.push({ label: 'Elevation', value: `${q.value}${unit}` })
    }
  }

  // Official website (P856)
  {
    const c = firstClaim(entity, 'P856')
    const v = snakValue(c)
    const url = typeof v === 'string' ? v.trim() : null
    if (url && /^https?:\/\//i.test(url)) pairs.push({ label: 'Website', value: url })
  }

  return { pairs, referencedQids }
}

