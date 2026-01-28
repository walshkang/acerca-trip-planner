'use client'

import { useState } from 'react'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { assertValidWikiCuratedData, type WikiCuratedData } from '@/lib/enrichment/wikiCurated'

type NormalizedData = {
  category: string
  energy?: string | null
  tags: string[]
  vibe?: string | null
}

function safeWikiCurated(v: unknown): WikiCuratedData | null {
  try {
    assertValidWikiCuratedData(v)
    return v as WikiCuratedData
  } catch {
    return null
  }
}

function safeNormalized(v: unknown): NormalizedData | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const d = v as any
  if (typeof d.category !== 'string') return null
  if (!Array.isArray(d.tags) || d.tags.some((t: any) => typeof t !== 'string')) return null
  if (d.energy !== undefined && d.energy !== null && typeof d.energy !== 'string') return null
  if (d.vibe !== undefined && d.vibe !== null && typeof d.vibe !== 'string') return null
  return d as NormalizedData
}

export default function InspectorCard(props: { onCommitted?: (placeId: string) => void }) {
  const candidate = useDiscoveryStore((s) => s.previewCandidate)
  const enrichment = useDiscoveryStore((s) => s.previewEnrichment)
  const clear = useDiscoveryStore((s) => s.clear)

  const [isCommitting, setIsCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)

  if (!candidate) return null

  const candidateId = candidate.id
  const curated = safeWikiCurated(enrichment?.curatedData ?? null)
  const normalized = safeNormalized(enrichment?.normalizedData ?? null)

  async function commit() {
    setCommitError(null)
    setIsCommitting(true)
    try {
      const res = await fetch('/api/places/promote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCommitError(json?.error || `HTTP ${res.status}`)
        return
      }
      const placeId = String(json?.place_id ?? '')
      if (!placeId) {
        setCommitError('Promotion succeeded but no place_id returned')
        return
      }
      clear()
      props.onCommitted?.(placeId)
    } catch (e: unknown) {
      setCommitError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div
      className="pointer-events-auto w-[min(420px,92vw)] rounded-lg border border-gray-200 bg-white shadow-lg"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Candidate preview"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {candidate.name}
            </h3>
            {candidate.address ? (
              <p className="mt-1 truncate text-xs text-gray-600">{candidate.address}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
          >
            Close
          </button>
        </div>

        {curated?.thumbnail_url || curated?.summary ? (
          <div className="flex gap-3">
            {curated?.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={curated.thumbnail_url}
                alt={curated.wikipedia_title ?? candidate.name}
                className="h-14 w-14 shrink-0 rounded-md object-cover bg-gray-50"
              />
            ) : null}
            <div className="min-w-0">
              {curated?.wikipedia_title ? (
                <p className="text-[11px] text-gray-500">
                  {curated.wikipedia_title}
                  {curated.wikidata_qid ? ` · ${curated.wikidata_qid}` : ''}
                </p>
              ) : null}
              {curated?.summary ? (
                <p className="mt-1 text-xs text-gray-700 line-clamp-4">
                  {curated.summary}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {normalized ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px]">
                {normalized.category}
              </span>
              {normalized.energy ? (
                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px]">
                  Energy: {normalized.energy}
                </span>
              ) : null}
              {normalized.vibe ? (
                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px]">
                  Vibe: {normalized.vibe}
                </span>
              ) : null}
            </div>

            {normalized.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {normalized.tags.slice(0, 10).map((t) => (
                  <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {commitError ? <p className="text-xs text-red-600">{commitError}</p> : null}

        <button
          type="button"
          onClick={commit}
          disabled={isCommitting}
          className="w-full rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {isCommitting ? 'Approving…' : 'Approve Pin'}
        </button>
      </div>
    </div>
  )
}
