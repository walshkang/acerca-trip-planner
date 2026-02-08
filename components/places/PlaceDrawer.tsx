'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import PlaceListMembershipEditor from '@/components/places/PlaceListMembershipEditor'
import PlaceUserMetaForm from '@/components/places/PlaceUserMetaForm'
import { normalizeTagList } from '@/lib/lists/tags'
import { PLACE_FOCUS_GLOW } from '@/lib/ui/glow'
import {
  assertValidWikiCuratedData,
  type WikiCuratedData,
} from '@/lib/enrichment/wikiCurated'

export type PlaceDrawerSummary = {
  id: string
  name: string
  category: string
  lat?: number | null
  lng?: number | null
}

type Props = {
  open: boolean
  place: PlaceDrawerSummary | null
  activeListId?: string | null
  activeListItemOverride?: { id: string; list_id: string; tags: string[] } | null
  topOffset?: number
  onClose: () => void
  tagsRefreshKey?: number
  onTagsUpdated?: () => void
  variant?: 'floating' | 'embedded'
  tone?: 'light' | 'dark'
}

type ListsResponse = {
  list_ids: string[]
  list_items?: Array<{ list_id: string; tags?: string[] | null }>
  error?: string
}

type PlaceDetailsResponse = {
  place: {
    id: string
    name: string
    address: string | null
    category: string
    energy: string | null
    opening_hours: unknown | null
    user_notes: string | null
    user_tags: string[] | null
    enrichment_id: string | null
  }
  enrichment:
    | {
        curated_data: unknown | null
        normalized_data: unknown | null
        raw_sources: {
          wikipediaCurated: unknown | null
          wikipediaSummary: unknown | null
        }
      }
    | null
  google:
    | {
        formatted_address?: string
        formatted_phone_number?: string
        website?: string
        url?: string
        opening_hours?: unknown
      }
    | null
  error?: string
}

function safeWikiCurated(v: unknown): WikiCuratedData | null {
  try {
    assertValidWikiCuratedData(v)
    return v as WikiCuratedData
  } catch {
    return null
  }
}

function weekdayTextFromOpeningHours(v: unknown): string[] | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const oh = v as any
  const wt = oh.weekday_text
  if (!Array.isArray(wt) || wt.some((x: unknown) => typeof x !== 'string')) return null
  return wt as string[]
}

export default function PlaceDrawer({
  open,
  place,
  activeListId = null,
  activeListItemOverride = null,
  topOffset,
  onClose,
  tagsRefreshKey,
  onTagsUpdated,
  variant = 'floating',
  tone = 'dark',
}: Props) {
  const [listIds, setListIds] = useState<string[]>([])
  const [listItems, setListItems] = useState<
    Array<{ id: string; list_id: string; tags: string[] }>
  >([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<PlaceDetailsResponse | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tagStatus, setTagStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [tagError, setTagError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [neighborhood, setNeighborhood] = useState<{
    name: string
    borough?: string | null
  } | null>(null)
  const [neighborhoodError, setNeighborhoodError] = useState<string | null>(
    null
  )

  const activeListItem = useMemo(() => {
    if (!activeListId) return null
    return listItems.find((item) => item.list_id === activeListId) ?? null
  }, [activeListId, listItems])
  const effectiveActiveListItem = useMemo(() => {
    if (activeListItem) return activeListItem
    if (
      activeListItemOverride &&
      activeListId &&
      activeListItemOverride.list_id === activeListId
    ) {
      return activeListItemOverride
    }
    return null
  }, [activeListId, activeListItem, activeListItemOverride])
  const effectiveListIds = useMemo(() => {
    if (!activeListItemOverride) return listIds
    const listId = activeListItemOverride.list_id
    if (listIds.includes(listId)) return listIds
    return [...listIds, listId]
  }, [activeListItemOverride, listIds])

  const fetchMembership = useCallback(async () => {
    if (!open || !place) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/places/${place.id}/lists`)
      const json = (await res.json().catch(() => ({}))) as Partial<ListsResponse>
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      setListIds((json?.list_ids ?? []) as string[])
      setListItems(
        ((json?.list_items ?? []) as Array<{
          id: string
          list_id: string
          tags?: string[] | null
        }>).map((item) => ({
          id: item.id,
          list_id: item.list_id,
          tags: Array.isArray(item.tags) ? item.tags : [],
        }))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [open, place])

  useEffect(() => {
    if (!open || !place) {
      setListIds([])
      setListItems([])
      setDetailsOpen(false)
      setDetailsLoading(false)
      setDetailsError(null)
      setDetails(null)
      setTagInput('')
      setTagStatus('idle')
      setTagError(null)
      setError(null)
      setNeighborhood(null)
      setNeighborhoodError(null)
      return
    }

    fetchMembership()
  }, [fetchMembership, open, place, tagsRefreshKey])

  useEffect(() => {
    setDetailsOpen(false)
    setDetailsLoading(false)
    setDetailsError(null)
    setDetails(null)
  }, [place?.id])

  useEffect(() => {
    if (
      !open ||
      place?.lat == null ||
      place?.lng == null ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lng)
    ) {
      setNeighborhood(null)
      setNeighborhoodError(null)
      return
    }
    let cancelled = false
    setNeighborhoodError(null)
    fetch(`/api/neighborhoods/lookup?lat=${place.lat}&lng=${place.lng}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json?.neighborhood) {
          setNeighborhood({
            name: json.neighborhood,
            borough: json.borough ?? null,
          })
        } else {
          setNeighborhood(null)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setNeighborhood(null)
        setNeighborhoodError(
          err instanceof Error ? err.message : 'Neighborhood lookup failed'
        )
      })
    return () => {
      cancelled = true
    }
  }, [open, place?.lat, place?.lng])

  const computedDetails = useMemo(() => {
    const curated = safeWikiCurated(details?.enrichment?.curated_data ?? null)
    const rawWikiSummary = details?.enrichment?.raw_sources?.wikipediaSummary as any
    const fallbackSummary =
      typeof rawWikiSummary?.summary === 'string' ? String(rawWikiSummary.summary) : null
    const fallbackThumb =
      typeof rawWikiSummary?.thumbnail_url === 'string'
        ? String(rawWikiSummary.thumbnail_url)
        : null

    return {
      wikiCurated: curated,
      summary: curated?.summary ?? fallbackSummary,
      thumbnailUrl: curated?.thumbnail_url ?? fallbackThumb,
      weekdayText:
        weekdayTextFromOpeningHours(details?.place?.opening_hours) ??
        weekdayTextFromOpeningHours(details?.google?.opening_hours),
    }
  }, [details])

  if (!open || !place) return null

  const activeListTags = effectiveActiveListItem?.tags ?? []

  async function fetchDetails() {
    if (!place) return
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const res = await fetch(`/api/places/${place.id}/details`)
      const json = (await res.json().catch(() => ({}))) as Partial<PlaceDetailsResponse>
      if (!res.ok) {
        throw new Error(String(json?.error || `HTTP ${res.status}`))
      }
      setDetails(json as PlaceDetailsResponse)
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setDetailsLoading(false)
    }
  }

  async function commitTags(nextTags: string[]) {
    if (!activeListId || !effectiveActiveListItem) return
    setTagStatus('saving')
    setTagError(null)
    try {
      const res = await fetch(
        `/api/lists/${activeListId}/items/${effectiveActiveListItem.id}/tags`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tags: nextTags }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as {
        item?: { tags?: string[] }
        error?: string
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updated = Array.isArray(json?.item?.tags) ? json.item.tags : []
      setListItems((prev) =>
        prev.map((item) =>
          item.id === effectiveActiveListItem.id
            ? { ...item, tags: updated }
            : item
        )
      )
      setTagInput('')
      setTagStatus('saved')
      onTagsUpdated?.()
    } catch (err: unknown) {
      setTagStatus('error')
      setTagError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function resetTagStatus() {
    if (tagStatus !== 'idle') {
      setTagStatus('idle')
      setTagError(null)
    }
  }

  async function handleAddTag(event?: FormEvent) {
    event?.preventDefault()
    const nextAdd = normalizeTagList(tagInput)
    if (!nextAdd || !nextAdd.length) return
    const merged = normalizeTagList([...(activeListTags ?? []), ...nextAdd]) ?? []
    await commitTags(merged)
  }

  async function handleRemoveTag(tag: string) {
    const next = activeListTags.filter((t) => t !== tag)
    await commitTags(next)
  }

  async function handleClearTags() {
    await commitTags([])
  }

  const isEmbedded = variant === 'embedded'
  const isDark = tone === 'dark'
  const computedTop = Math.max(96, (topOffset ?? 0) + 16)
  const rootTextClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const borderClass = isDark ? 'border-white/10' : 'border-slate-300/60'
  const kickerClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const secondaryTextClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const bodyLabelClass = isDark ? 'text-slate-300' : 'text-slate-700'
  const bodyMutedClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const bodyTextClass = isDark ? 'text-slate-200' : 'text-slate-800'
  const actionClass = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'
  const chipClass = isDark
    ? 'border-white/10 text-slate-300'
    : 'border-slate-300 text-slate-700'
  const tagChipClass = isDark
    ? 'border-white/10 text-slate-200'
    : 'border-slate-300 text-slate-700'
  const tagChipButtonClass = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : 'text-slate-500 hover:text-slate-700'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'
  const warnClass = isDark ? 'text-amber-300' : 'text-amber-700'
  const successClass = isDark ? 'text-emerald-300' : 'text-emerald-700'

  return (
    <aside
      className={
        isEmbedded
          ? `${rootTextClass} ${PLACE_FOCUS_GLOW}`
          : `glass-panel absolute right-4 z-20 w-[min(360px,90vw)] max-h-[80vh] overflow-hidden rounded-xl ${rootTextClass} ${PLACE_FOCUS_GLOW}`
      }
      style={isEmbedded ? undefined : { top: `${computedTop}px` }}
      data-testid="place-drawer"
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${borderClass}`}
      >
        <div>
          <p className={`text-[11px] uppercase tracking-wide ${kickerClass}`}>Place</p>
          <h2 className={`text-sm font-semibold ${titleClass}`}>{place.name}</h2>
          {neighborhood ? (
            <p className={`text-[11px] ${secondaryTextClass}`}>
              {neighborhood.name}
              {neighborhood.borough ? ` · ${neighborhood.borough}` : ''}
            </p>
          ) : null}
          {neighborhoodError ? (
            <p className={`text-[11px] ${warnClass}`}>{neighborhoodError}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`text-xs ${actionClass}`}
        >
          Close
        </button>
      </div>

      <div className="space-y-4 px-4 py-3">
        <div className="space-y-1">
          <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Place type</p>
          <p className={`text-[11px] ${bodyMutedClass}`}>
            A fixed category that sets this place’s map icon.
          </p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
              {place.category}
            </span>
            <button
              type="button"
              onClick={async () => {
                setDetailsOpen((prev) => !prev)
                if (!details && !detailsLoading) {
                  await fetchDetails()
                }
              }}
              className={`text-[11px] underline ${actionClass}`}
            >
              {detailsOpen ? 'Hide details' : 'Show details'}
            </button>
          </div>
        </div>

        {detailsOpen ? (
          <div className="space-y-3">
            {detailsLoading ? (
              <p className={`text-xs ${bodyLabelClass}`}>Loading details…</p>
            ) : null}
            {detailsError ? (
              <p className={`text-xs ${errorClass}`}>{detailsError}</p>
            ) : null}

            {details?.place?.address ? (
              <div>
                <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Address</p>
                <p className={`mt-1 text-xs ${bodyTextClass}`}>{details.place.address}</p>
              </div>
            ) : null}

            {details?.place?.energy ? (
              <div>
                <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Energy</p>
                <p className={`mt-1 text-xs ${bodyTextClass}`}>{details.place.energy}</p>
              </div>
            ) : null}

            {computedDetails.weekdayText?.length ? (
              <div>
                <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>
                  Opening hours
                </p>
                <ul className={`mt-1 space-y-1 text-xs ${bodyTextClass}`}>
                  {computedDetails.weekdayText.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {details?.google?.website || details?.google?.url ? (
              <div>
                <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Google</p>
                <div className={`mt-1 space-y-1 text-xs ${bodyTextClass}`}>
                  {details.google.website ? (
                    <p>
                      Website:{' '}
                      <a
                        className={`underline ${bodyTextClass}`}
                        href={details.google.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {details.google.website}
                      </a>
                    </p>
                  ) : null}
                  {details.google.url ? (
                    <p>
                      Maps:{' '}
                      <a
                        className={`underline ${bodyTextClass}`}
                        href={details.google.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Google Maps
                      </a>
                    </p>
                  ) : null}
                  {details.google.formatted_phone_number ? (
                    <p>Phone: {details.google.formatted_phone_number}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {computedDetails.summary ||
            computedDetails.thumbnailUrl ||
            computedDetails.wikiCurated?.primary_fact_pairs?.length ? (
              <div>
                <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>Wikipedia</p>
                <div className="mt-2 flex gap-3">
                  {computedDetails.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={computedDetails.thumbnailUrl}
                      alt={computedDetails.wikiCurated?.wikipedia_title ?? place.name}
                      className={`h-14 w-14 shrink-0 rounded-md object-cover ${
                        isDark ? 'bg-slate-800/60' : 'bg-slate-200/80'
                      }`}
                    />
                  ) : null}
                  <div className="min-w-0 space-y-1">
                    {computedDetails.wikiCurated?.wikipedia_title ? (
                      <p className={`text-[11px] ${bodyMutedClass}`}>
                        {computedDetails.wikiCurated.wikipedia_title}
                        {computedDetails.wikiCurated.wikidata_qid
                          ? ` · ${computedDetails.wikiCurated.wikidata_qid}`
                          : ''}
                      </p>
                    ) : null}
                    {computedDetails.summary ? (
                      <p className={`text-xs leading-5 ${bodyTextClass}`}>
                        {computedDetails.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {details?.place?.id ? (
              <div>
                <PlaceUserMetaForm
                  placeId={details.place.id}
                  initialNotes={details.place.user_notes ?? null}
                  tone={tone}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? <p className={`text-xs ${bodyLabelClass}`}>Loading lists…</p> : null}
        {error ? <p className={`text-xs ${errorClass}`}>{error}</p> : null}

        {effectiveActiveListItem ? (
          <div className="space-y-2">
            <p className={`text-[11px] font-semibold ${bodyLabelClass}`}>
              List tags
            </p>
            {activeListTags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeListTags.map((tag) => (
                  <span
                    key={`list-tag:${tag}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${tagChipClass}`}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className={`text-[10px] ${tagChipButtonClass}`}
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearTags}
                  className={`text-[10px] underline ${actionClass}`}
                >
                  × Clear
                </button>
              </div>
            ) : (
              <p className={`text-[11px] ${bodyMutedClass}`}>No tags yet.</p>
            )}
            <form onSubmit={handleAddTag} className="flex flex-wrap items-center gap-2">
              <input
                className="glass-input flex-1 text-xs"
                placeholder="Add tags (comma-separated)"
                value={tagInput}
                onChange={(event) => {
                  setTagInput(event.target.value)
                  resetTagStatus()
                }}
                disabled={tagStatus === 'saving'}
              />
              <button
                type="submit"
                className="glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60"
                disabled={tagStatus === 'saving'}
              >
                {tagStatus === 'saving' ? 'Saving…' : 'Add'}
              </button>
            </form>
            {tagStatus === 'saved' ? (
              <p className={`text-[11px] ${successClass}`}>Saved.</p>
            ) : null}
            {tagStatus === 'error' ? (
              <p className={`text-[11px] ${errorClass}`}>{tagError}</p>
            ) : null}
          </div>
        ) : activeListId ? (
          <p className={`text-[11px] ${bodyMutedClass}`}>
            Add this place to the active list to edit list tags.
          </p>
        ) : null}

        <PlaceListMembershipEditor
          placeId={place.id}
          initialSelectedIds={effectiveListIds}
          tone={tone}
          onMembershipChange={() => {
            fetchMembership()
          }}
        />
      </div>
    </aside>
  )
}
