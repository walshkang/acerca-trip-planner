'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MapPlace } from '@/components/map/MapView.types'
import { SocialUrlIngest } from '@/components/stitch/SocialUrlIngest'
import ResearchTriagePanel from '@/components/stitch/ResearchTriagePanel'
import type { UserSocialSourcePlace, UserSocialSourceRow } from '@/lib/social/user-sources-contract'
import { useTripStore } from '@/lib/state/useTripStore'

type AddStatus = 'idle' | 'loading' | 'added' | 'duplicate' | 'error'

function platformChipLabel(platform: string): string {
  const p = platform.trim().toLowerCase()
  if (p.includes('youtube')) return 'YOUTUBE'
  if (p.includes('tiktok')) return 'TIKTOK'
  if (p.includes('blog') || p === 'medium' || p.includes('wordpress')) return 'BLOG'
  return (platform.trim().toUpperCase() || 'SOURCE')
}

function calloutPrefix(type: 'dish' | 'drink' | 'activity' | 'tip'): string {
  if (type === 'dish') return '🍽'
  if (type === 'drink') return '🥤'
  if (type === 'activity') return '📍'
  return '💡'
}

function SourcePlaceCard({
  place,
  activeListId,
  onMoreDetails,
}: {
  place: UserSocialSourcePlace
  activeListId: string | null
  onMoreDetails: (placeId: string) => void
}) {
  const [addStatus, setAddStatus] = useState<AddStatus>('idle')

  useEffect(() => {
    if (addStatus !== 'added') return
    const timeout = window.setTimeout(() => {
      setAddStatus('idle')
    }, 2000)
    return () => window.clearTimeout(timeout)
  }, [addStatus])

  const hasRating = place.google_rating != null
  const ratingText =
    place.google_rating != null ? place.google_rating.toFixed(1) : null
  const reviewCount = place.google_review_count ?? 0
  const addDisabled = !activeListId || addStatus === 'loading'

  async function onAddToList() {
    if (!activeListId) return
    setAddStatus('loading')
    try {
      const res = await fetch(
        `/api/lists/${activeListId}/items?place_id=${encodeURIComponent(place.place_id)}`,
        { method: 'POST' }
      )
      if (res.ok) {
        setAddStatus('added')
        return
      }
      if (res.status === 409) {
        setAddStatus('duplicate')
        return
      }
      setAddStatus('error')
    } catch {
      setAddStatus('error')
    }
  }

  return (
    <div className="rounded border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-paper-on-surface">{place.place_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="paper-chip py-0.5 text-[10px] leading-tight">{place.category}</span>
            {hasRating ? (
              <span className="text-xs text-paper-on-surface-variant">
                ★ {ratingText}
                {reviewCount >= 1 ? ` (${reviewCount})` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-xs italic text-paper-on-surface-variant">
        "{place.snippet}"
      </p>

      {place.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span key={`tag:${place.place_id}:${tag}`} className="paper-chip py-0.5 text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {place.callouts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {place.callouts.map((callout, idx) => (
            <span
              key={`callout:${place.place_id}:${idx}`}
              className="paper-chip-active py-0.5 text-[10px]"
            >
              {calloutPrefix(callout.type)} {callout.text}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="paper-button-ghost px-2 py-1 text-xs"
          onClick={() => onMoreDetails(place.place_id)}
        >
          More details
        </button>
        <button
          type="button"
          className="paper-button-primary px-2 py-1 text-xs disabled:opacity-60"
          onClick={() => void onAddToList()}
          disabled={addDisabled}
        >
          {addStatus === 'loading'
            ? 'Adding…'
            : addStatus === 'added'
              ? 'Added ✓'
              : addStatus === 'duplicate'
                ? 'Already added'
                : addStatus === 'error'
                  ? 'Try again'
                  : '+ Add to list'}
        </button>
      </div>
    </div>
  )
}

function SourcesSkeleton() {
  return (
    <div className="space-y-3 px-3 py-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded border border-paper-tertiary-fixed bg-paper-surface-container p-3"
        >
          <div className="h-3 w-1/3 rounded bg-paper-tertiary-fixed" />
          <div className="mt-2 h-4 w-2/3 rounded bg-paper-tertiary-fixed" />
          <div className="mt-2 h-3 w-full rounded bg-paper-tertiary-fixed/70" />
        </div>
      ))}
    </div>
  )
}

type SourcesPanelProps = {
  onMoreDetails?: (placeId: string) => void
  onSelectedSourceChange?: (source: UserSocialSourceRow | null) => void
  researchListId: string | null
  onResearchListIdChange: (id: string | null) => void
  onResearchMapPlacesChange: (places: MapPlace[]) => void
  searchThisAreaTick: number
}

export default function SourcesPanel({
  onMoreDetails,
  onSelectedSourceChange,
  researchListId,
  onResearchListIdChange,
  onResearchMapPlacesChange,
  searchThisAreaTick,
}: SourcesPanelProps) {
  const [sources, setSources] = useState<UserSocialSourceRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const activeListId = useTripStore((s) => s.activeListId)

  const loadSources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/enrichment/user-sources', {
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        setError('Sign in to view your sources.')
        setSources([])
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'Could not load sources.')
        setSources([])
        return
      }
      const body = (await res.json()) as { sources?: UserSocialSourceRow[] }
      const list = body.sources ?? []
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setSources(sorted)
      setSelectedSourceId((prev) => prev ?? sorted[0]?.source_id ?? null)
    } catch {
      setError('Could not load sources.')
      setSources([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSources()
  }, [loadSources])

  useEffect(() => {
    if (!sources?.length) {
      setSelectedSourceId(null)
      return
    }
    if (!selectedSourceId || !sources.some((source) => source.source_id === selectedSourceId)) {
      setSelectedSourceId(sources[0]!.source_id)
    }
  }, [selectedSourceId, sources])

  const selectedSource = useMemo(() => {
    if (!sources?.length) return null
    if (!selectedSourceId) return sources[0] ?? null
    return sources.find((source) => source.source_id === selectedSourceId) ?? sources[0] ?? null
  }, [selectedSourceId, sources])

  useEffect(() => {
    onSelectedSourceChange?.(selectedSource)
  }, [onSelectedSourceChange, selectedSource])

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper-surface-warm">
      <ResearchTriagePanel
        userSources={sources}
        researchListId={researchListId}
        onResearchListIdChange={onResearchListIdChange}
        onResearchMapPlacesChange={onResearchMapPlacesChange}
        searchThisAreaTick={searchThisAreaTick}
      />
      <div className="sticky top-0 z-10 border-b border-paper-tertiary-fixed bg-paper-surface-warm">
        <SocialUrlIngest
          hideSuccessBanner
          dataTestIdUrlInput="sources-url-input"
          onIngestSuccess={loadSources}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <SourcesSkeleton />
        ) : error ? (
          <p className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !sources?.length ? (
          <p className="px-3 py-8 text-center text-sm text-paper-on-surface-variant">
            Paste a YouTube or blog URL above to get started
          </p>
        ) : (
          <div className="space-y-3 px-3 pb-4 pt-3">
            <div>
              <label
                htmlFor="sources-select"
                className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-on-surface-variant"
              >
                Source
              </label>
              <select
                id="sources-select"
                data-testid="sources-select"
                value={selectedSource?.source_id ?? ''}
                onChange={(e) => setSelectedSourceId(e.target.value || null)}
                className="mt-1 w-full rounded border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1.5 text-sm text-paper-on-surface focus:outline-none focus:ring-1 focus:ring-paper-primary"
              >
                {sources.map((source) => (
                  <option key={source.source_id} value={source.source_id}>
                    {source.title?.trim() || source.url}
                  </option>
                ))}
              </select>
              {selectedSource ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-paper-on-surface-variant">
                  <span className="paper-chip py-0.5">
                    {platformChipLabel(selectedSource.platform)}
                  </span>
                  <span>@{selectedSource.author_name}</span>
                  <span className="capitalize">{selectedSource.author_persona}</span>
                </div>
              ) : null}
            </div>

            {selectedSource?.places.length ? (
              <div className="space-y-2">
                {selectedSource.places.map((place) => (
                  <SourcePlaceCard
                    key={place.place_id}
                    place={place}
                    activeListId={activeListId}
                    onMoreDetails={(placeId) => onMoreDetails?.(placeId)}
                  />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-paper-on-surface-variant">
                No places extracted from this source
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
