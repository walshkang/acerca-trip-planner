'use client'

import { useEffect, useState } from 'react'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { assertValidWikiCuratedData, type WikiCuratedData } from '@/lib/enrichment/wikiCurated'

type NormalizedData = {
  category: string
  energy?: string | null
  tags: string[]
  vibe?: string | null
}

type ListSummary = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
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

export default function InspectorCard(props: {
  onCommitted?: (placeId: string) => void
  onClose?: () => void
}) {
  const candidate = useDiscoveryStore((s) => s.previewCandidate)
  const enrichment = useDiscoveryStore((s) => s.previewEnrichment)
  const google = useDiscoveryStore((s) => s.previewGoogle)
  const selectedResult = useDiscoveryStore((s) => s.selectedResult)
  const clear = useDiscoveryStore((s) => s.clear)

  const [isCommitting, setIsCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [lists, setLists] = useState<ListSummary[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  useEffect(() => {
    if (!candidate) return
    setTagInput('')
    setShowMoreDetails(false)
    let cancelled = false
    async function loadLists() {
      setListsLoading(true)
      setListsError(null)
      try {
        const res = await fetch('/api/lists')
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) setListsError(json?.error || `HTTP ${res.status}`)
          return
        }
        const next = (json?.lists ?? []) as ListSummary[]
        if (cancelled) return
        setLists(next)
        setSelectedListId((prev) => {
          if (prev && next.some((l) => l.id === prev)) return prev
          return null
        })
      } catch (e: unknown) {
        if (!cancelled) {
          setListsError(e instanceof Error ? e.message : 'Request failed')
        }
      } finally {
        if (!cancelled) setListsLoading(false)
      }
    }
    loadLists()
    return () => {
      cancelled = true
    }
  }, [candidate?.id])

  async function createList() {
    const name = newListName.trim()
    if (!name) return
    setCreatingList(true)
    setListsError(null)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListsError(json?.error || `HTTP ${res.status}`)
        return
      }
      const list = json?.list as ListSummary | undefined
      if (list) {
        setLists((prev) => [...prev, list])
        setSelectedListId(list.id)
        setNewListName('')
      }
    } catch (e: unknown) {
      setListsError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setCreatingList(false)
    }
  }

  if (!candidate) return null

  const candidateId = candidate.id
  const curated = safeWikiCurated(enrichment?.curatedData ?? null)
  const normalized = safeNormalized(enrichment?.normalizedData ?? null)
  const showWiki = normalized?.category === 'Sights'
  const neighborhoodLabel = selectedResult?.neighborhood
    ? `${selectedResult.neighborhood}${selectedResult.borough ? ` · ${selectedResult.borough}` : ''}`
    : null
  const googleTypes = google?.types?.length
    ? google.types.map((t) => t.replaceAll('_', ' '))
    : []

  async function commit() {
    setCommitError(null)
    setIsCommitting(true)
    try {
      const trimmedTags = tagInput.trim()
      if (trimmedTags.length && !selectedListId) {
        setCommitError('Choose a list to save list-item tags (or clear tags).')
        return
      }
      const res = await fetch('/api/places/promote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          list_id: selectedListId ?? null,
          tags: trimmedTags.length ? trimmedTags : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCommitError(json?.error || `HTTP ${res.status}`)
        return
      }
      const placeId = String(json?.place_id ?? '')
      const resolvedListId = typeof json?.list_id === 'string' ? json.list_id : null
      if (!placeId) {
        setCommitError('Promotion succeeded but no place_id returned')
        return
      }
      if (trimmedTags.length) {
        const listIdForTags = resolvedListId ?? selectedListId
        if (listIdForTags) {
          const payload: { place_id: string; tags: string } = {
            place_id: placeId,
            tags: trimmedTags,
          }
          const tagsRes = await fetch(`/api/lists/${listIdForTags}/items`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!tagsRes.ok) {
            const tagsJson = await tagsRes.json().catch(() => ({}))
            console.error('Failed to save tags on approval', tagsJson)
          }
        }
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
      className="glass-panel pointer-events-auto w-[min(420px,92vw)] rounded-lg text-slate-100"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Candidate preview"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-100">
              {candidate.name}
            </h3>
            {candidate.address ? (
              <p className="mt-1 truncate text-xs text-slate-300">
                {candidate.address}
              </p>
            ) : null}
            {neighborhoodLabel ? (
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {neighborhoodLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={props.onClose ?? clear}
            className="glass-button px-2 py-1 text-[11px]"
          >
            Close
          </button>
        </div>

        {google?.website || google?.url || google?.opening_hours || googleTypes.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="glass-button px-3 py-1 text-[11px]"
            >
              {showMoreDetails ? 'Hide details' : 'More details'}
            </button>

            {showMoreDetails ? (
              <div className="mt-2 space-y-2 text-xs text-slate-200">
                {google?.opening_hours ? (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">
                      Hours
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      {google.opening_hours.open_now === true
                        ? 'Open now'
                        : google.opening_hours.open_now === false
                          ? 'Closed now'
                          : 'Hours status unavailable'}
                    </p>
                    {google.opening_hours.weekday_text?.length ? (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                        {google.opening_hours.weekday_text
                          .slice(0, 7)
                          .map((row) => (
                            <li key={row}>{row}</li>
                          ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {googleTypes.length ? (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">
                      Google types
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {googleTypes.slice(0, 12).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {google?.website ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-200">
                      Website
                    </span>
                    <a
                      className="truncate text-[11px] text-slate-300 underline hover:text-slate-100"
                      href={google.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {google.website}
                    </a>
                  </div>
                ) : null}

                {google?.url ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-200">
                      Google Maps
                    </span>
                    <a
                      className="truncate text-[11px] text-slate-300 underline hover:text-slate-100"
                      href={google.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showWiki && (curated?.thumbnail_url || curated?.summary) ? (
          <div className="flex gap-3">
            {curated?.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={curated.thumbnail_url}
                alt={curated.wikipedia_title ?? candidate.name}
                className="h-14 w-14 shrink-0 rounded-md object-cover bg-slate-800/60"
              />
            ) : null}
            <div className="min-w-0">
              {curated?.wikipedia_title ? (
                <p className="text-[11px] text-slate-300">
                  {curated.wikipedia_title}
                  {curated.wikidata_qid ? ` · ${curated.wikidata_qid}` : ''}
                </p>
              ) : null}
              {curated?.summary ? (
                <p className="mt-1 text-xs text-slate-200 line-clamp-4">
                  {curated.summary}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {normalized ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-200">
                {normalized.category}
              </span>
              {normalized.energy ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-200">
                  Energy: {normalized.energy}
                </span>
              ) : null}
              {normalized.vibe ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-200">
                  Vibe: {normalized.vibe}
                </span>
              ) : null}
            </div>

            {normalized.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {normalized.tags.slice(0, 10).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {commitError ? <p className="text-xs text-red-300">{commitError}</p> : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">List</p>
          </div>
          <select
            className="glass-input w-full px-2 py-2 text-xs"
            value={selectedListId ?? ''}
            onChange={(e) => setSelectedListId(e.target.value || null)}
            disabled={listsLoading}
          >
            {listsLoading ? (
              <option value="">Loading…</option>
            ) : null}
            <option value="">No list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
                {list.is_default ? ' (Default)' : ''}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              className="glass-input flex-1 text-xs"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name"
            />
            <button
              type="button"
              onClick={createList}
              disabled={creatingList || !newListName.trim()}
              className="glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-50"
            >
              {creatingList ? 'Adding…' : 'Add'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Add tags (optional)
            </label>
            <input
              className="glass-input mt-1 w-full text-xs"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              disabled={!selectedListId}
              placeholder="date-night, rooftop, kid-friendly"
            />
            {!selectedListId ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Tags apply to list items. Choose a list to enable tags.
              </p>
            ) : null}
          </div>
          {listsError ? (
            <p className="text-xs text-red-300">{listsError}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={commit}
          disabled={isCommitting}
          className="w-full rounded-md bg-slate-100/90 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          {isCommitting ? 'Approving…' : 'Approve Pin'}
        </button>
      </div>
    </div>
  )
}
