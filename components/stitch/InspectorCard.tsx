'use client'

import { useEffect, useRef, useState } from 'react'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { assertValidWikiCuratedData, type WikiCuratedData } from '@/lib/enrichment/wikiCurated'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import { isCategoryEnum } from '@/lib/lists/filters'
import { listItemSeedTagsFromNormalizedData } from '@/lib/lists/list-item-seed-tags'
import { normalizeTagList } from '@/lib/lists/tags'
import {
  CATEGORY_ENUM_VALUES,
  type CategoryEnum,
} from '@/lib/types/enums'

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
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [commitCategory, setCommitCategory] = useState<CategoryEnum>('Activity')
  const userPickedCommitCategoryRef = useRef(false)
  const [includedAutoTags, setIncludedAutoTags] = useState<string[]>([])
  const userEditedSuggestedTagsRef = useRef(false)

  const { resolveCategoryEmoji } = useCategoryIconOverrides(selectedListId)

  useEffect(() => {
    userPickedCommitCategoryRef.current = false
    userEditedSuggestedTagsRef.current = false
  }, [candidate?.id])

  useEffect(() => {
    if (!candidate) return
    setTagInput('')
    setShowMoreDetails(false)
    setShowNewListInput(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- candidate?.id identifies preview session
  }, [candidate?.id])

  useEffect(() => {
    if (!candidate || userPickedCommitCategoryRef.current) return
    const n = safeNormalized(enrichment?.normalizedData ?? null)
    setCommitCategory(
      n?.category && isCategoryEnum(n.category) ? n.category : 'Activity'
    )
  }, [candidate, enrichment?.normalizedData])

  useEffect(() => {
    if (!candidate || userEditedSuggestedTagsRef.current) return
    const n = safeNormalized(enrichment?.normalizedData ?? null)
    if (!n) {
      setIncludedAutoTags([])
      return
    }
    setIncludedAutoTags(
      listItemSeedTagsFromNormalizedData({
        tags: n.tags,
        category: n.category,
      })
    )
  }, [candidate, enrichment?.normalizedData])

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
        setShowNewListInput(false)
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
      const manualFromInput = normalizeTagList(tagInput.trim()) ?? []
      if (manualFromInput.length && !selectedListId) {
        setCommitError('Choose a list to save list-item tags (or clear tags).')
        return
      }
      const mergedForList =
        normalizeTagList([...includedAutoTags, ...manualFromInput]) ?? []

      const promotePayload: {
        candidate_id: string
        list_id: string | null
        include_automatic_tags: boolean
        tags?: string
      } = {
        candidate_id: candidateId,
        list_id: selectedListId ?? null,
        include_automatic_tags: false,
      }
      if (mergedForList.length) {
        promotePayload.tags = mergedForList.join(', ')
      }

      const promoteOnce = async () => {
        const response = await fetch('/api/places/promote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(promotePayload),
        })
        const body = await response.json().catch(() => ({}))
        return { response, body }
      }

      let promoteAttempt = await promoteOnce()
      const promoteError =
        typeof promoteAttempt.body?.error === 'string'
          ? promoteAttempt.body.error
          : ''

      if (
        !promoteAttempt.response.ok &&
        promoteError.includes('Candidate must be enriched before promotion')
      ) {
        const enrichRes = await fetch('/api/enrichment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            candidate_id: candidateId,
            schema_version: 2,
          }),
        })
        const enrichJson = await enrichRes.json().catch(() => ({}))
        if (!enrichRes.ok) {
          setCommitError(enrichJson?.error || `HTTP ${enrichRes.status}`)
          return
        }

        promoteAttempt = await promoteOnce()
      }

      const { response: res, body: json } = promoteAttempt
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

      const patchRes = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category: commitCategory }),
      })
      const patchJson = await patchRes.json().catch(() => ({}))
      if (!patchRes.ok) {
        setCommitError(
          typeof patchJson?.error === 'string'
            ? patchJson.error
            : `HTTP ${patchRes.status}`
        )
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
      className="pointer-events-auto w-[min(420px,92vw)] rounded-lg border border-paper-tertiary-fixed bg-paper-surface-warm shadow-sm text-paper-on-surface"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Candidate preview"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-paper-on-surface">
              {candidate.name}
            </h3>
            {candidate.address ? (
              <p className="mt-1 truncate text-xs text-paper-on-surface-variant">
                {candidate.address}
              </p>
            ) : null}
            {neighborhoodLabel ? (
              <p className="mt-1 truncate text-[11px] text-paper-on-surface-variant">
                {neighborhoodLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={props.onClose ?? clear}
            className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container"
          >
            Close
          </button>
        </div>

        {google?.website || google?.url || google?.opening_hours || googleTypes.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container"
            >
              {showMoreDetails ? 'Hide details' : 'More details'}
            </button>

            {showMoreDetails ? (
              <div className="mt-2 space-y-2 text-xs text-paper-on-surface">
                {google?.opening_hours ? (
                  <div>
                    <p className="text-[11px] font-semibold text-paper-on-surface">
                      Hours
                    </p>
                    <p className="mt-0.5 text-[11px] text-paper-on-surface-variant">
                      {google.opening_hours.open_now === true
                        ? 'Open now'
                        : google.opening_hours.open_now === false
                          ? 'Closed now'
                          : 'Hours status unavailable'}
                    </p>
                    {google.opening_hours.weekday_text?.length ? (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-paper-on-surface-variant">
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
                    <p className="text-[11px] font-semibold text-paper-on-surface">
                      Google types
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {googleTypes.slice(0, 12).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container-high"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {google?.website ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-paper-on-surface">
                      Website
                    </span>
                    <a
                      className="truncate text-[11px] text-paper-primary underline transition-colors hover:text-paper-primary-container"
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
                    <span className="text-[11px] font-semibold text-paper-on-surface">
                      Google Maps
                    </span>
                    <a
                      className="truncate text-[11px] text-paper-primary underline transition-colors hover:text-paper-primary-container"
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
                className="h-14 w-14 shrink-0 rounded-md bg-paper-surface-container object-cover"
              />
            ) : null}
            <div className="min-w-0">
              {curated?.wikipedia_title ? (
                <p className="text-[11px] text-paper-on-surface-variant">
                  {curated.wikipedia_title}
                  {curated.wikidata_qid ? ` · ${curated.wikidata_qid}` : ''}
                </p>
              ) : null}
              {curated?.summary ? (
                <p className="mt-1 line-clamp-4 text-xs text-paper-on-surface">
                  {curated.summary}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-paper-on-surface">
            Place type
          </p>
          <p className="text-[11px] text-paper-on-surface-variant">
            Sets the map icon before this pin is saved.
          </p>
          <div className="flex flex-wrap gap-2" data-testid="inspector-category-chips">
            {CATEGORY_ENUM_VALUES.map((cat) => {
              const selected = commitCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={selected}
                  disabled={isCommitting}
                  onClick={() => {
                    userPickedCommitCategoryRef.current = true
                    setCommitCategory(cat)
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    selected
                      ? 'border-paper-on-surface bg-paper-on-surface text-paper-surface'
                      : 'border-paper-tertiary-fixed bg-paper-surface-container text-paper-on-surface hover:bg-paper-surface-container-high'
                  }`}
                >
                  <span
                    aria-hidden
                    className="mr-1 inline-block text-base leading-none"
                  >
                    {resolveCategoryEmoji(cat)}
                  </span>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-paper-on-surface">
              Suggested tags
            </p>
            {includedAutoTags.length ? (
              <button
                type="button"
                disabled={isCommitting}
                onClick={() => {
                  userEditedSuggestedTagsRef.current = true
                  setIncludedAutoTags([])
                }}
                className="text-[11px] text-paper-on-surface-variant underline transition-colors hover:text-paper-on-surface disabled:opacity-50"
              >
                Clear all suggested
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-paper-on-surface-variant">
            From enrichment — remove any you do not want on the list.
          </p>
          {includedAutoTags.length ? (
            <div className="flex flex-wrap gap-2" data-testid="inspector-suggested-tags">
              {includedAutoTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container-high"
                >
                  {t.startsWith('#') ? t : `#${t}`}
                  <button
                    type="button"
                    disabled={isCommitting}
                    onClick={() => {
                      userEditedSuggestedTagsRef.current = true
                      setIncludedAutoTags((prev) => prev.filter((x) => x !== t))
                    }}
                    className="text-paper-on-surface-variant transition-colors hover:text-paper-on-surface"
                    aria-label={`Remove suggested tag ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-paper-on-surface-variant">
              No suggested tags for this pin.
            </p>
          )}
        </div>

        {normalized && (normalized.energy || normalized.vibe) ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {normalized.energy ? (
                <span className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface">
                  Energy: {normalized.energy}
                </span>
              ) : null}
              {normalized.vibe ? (
                <span className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface">
                  Vibe: {normalized.vibe}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {commitError ? (
          <p className="text-xs text-red-600">
            {commitError}
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-paper-on-surface">
              List
            </p>
          </div>
          {listsLoading ? (
            <p className="text-xs text-paper-on-surface-variant">Loading lists…</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => {
              const selected = selectedListId === list.id
              return (
                <button
                  key={list.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedListId(selected ? null : list.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-paper-on-surface bg-paper-on-surface text-paper-surface'
                      : 'border-paper-tertiary-fixed bg-paper-surface-container text-paper-on-surface hover:bg-paper-surface-container-high'
                  }`}
                >
                  {list.name}
                  {list.is_default ? ' (Default)' : ''}
                </button>
              )
            })}
            <button
              type="button"
              aria-expanded={showNewListInput}
              onClick={() => setShowNewListInput((v) => !v)}
              className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container px-2.5 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container-high"
            >
              + New list
            </button>
          </div>

          {showNewListInput ? (
            <div className="flex items-center gap-2">
              <input
                className="w-full flex-1 rounded-md border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-1.5 text-xs text-paper-on-surface placeholder:text-paper-on-surface-variant focus:border-paper-primary focus:outline-none"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name"
              />
              <button
                type="button"
                onClick={createList}
                disabled={creatingList || !newListName.trim()}
                className="rounded-full border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1 text-xs font-medium text-paper-on-surface transition-colors hover:bg-paper-surface-container disabled:opacity-50"
              >
                {creatingList ? 'Adding…' : 'Add'}
              </button>
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-medium text-paper-on-surface">
              Add tags (optional)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-1.5 text-xs text-paper-on-surface placeholder:text-paper-on-surface-variant focus:border-paper-primary focus:outline-none"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              disabled={!selectedListId}
              placeholder="date-night, rooftop, kid-friendly"
            />
            {!selectedListId ? (
              <p className="mt-1 text-[11px] text-paper-on-surface-variant">
                Tags apply to list items. Choose a list to enable tags.
              </p>
            ) : null}
          </div>
          {listsError ? (
            <p className="text-xs text-red-600">
              {listsError}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          data-onboarding="approve-pin"
          onClick={commit}
          disabled={isCommitting}
          className="w-full rounded-full bg-paper-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-paper-on-primary transition-colors hover:bg-paper-primary-container disabled:opacity-50"
        >
          {isCommitting ? 'Approving…' : 'Approve Pin'}
        </button>
      </div>
    </div>
  )
}
