'use client'

import dynamic from 'next/dynamic'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SocialUrlIngest } from '@/components/stitch/SocialUrlIngest'
import type { ExportItem } from '@/lib/social/sources-export-payload'
import type { UserSocialSourcePlace, UserSocialSourceRow } from '@/lib/social/user-sources-contract'
import { getPlaceStateSnapshot, useSourcesStore } from '@/lib/state/useSourcesStore'

const SourcesExportSheet = dynamic(
  () => import('@/components/stitch/SourcesExportSheet'),
  { ssr: false }
)

function platformChipLabel(platform: string): string {
  const p = platform.trim().toLowerCase()
  if (p.includes('youtube')) return 'YOUTUBE'
  if (p.includes('tiktok')) return 'TIKTOK'
  if (p.includes('blog') || p === 'medium' || p.includes('wordpress')) return 'BLOG'
  return (platform.trim().toUpperCase() || 'SOURCE')
}

function cycleDayIndex(current: number | undefined): number | undefined {
  if (current === undefined) return 1
  if (current >= 7) return undefined
  return current + 1
}

function mergeTags(existing: string[], raw: string): string[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set(existing)
  const out = [...existing]
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p)
      out.push(p)
    }
  }
  return out
}

function SourcePlaceRow({ place }: { place: UserSocialSourcePlace }) {
  const place_id = place.place_id
  const placeState = useSourcesStore((s) => getPlaceStateSnapshot(s.placeState, place_id))
  const setDayIndex = useSourcesStore((s) => s.setDayIndex)
  const setTags = useSourcesStore((s) => s.setTags)
  const toggleExcluded = useSourcesStore((s) => s.toggleExcluded)

  const [tagDraft, setTagDraft] = useState('')

  const excluded = placeState.excluded
  const dayIndex = placeState.day_index
  const tags = placeState.tags

  const commitTags = useCallback(() => {
    if (!tagDraft.trim()) return
    setTags(place_id, mergeTags(tags, tagDraft))
    setTagDraft('')
  }, [place_id, setTags, tagDraft, tags])

  const onDayClick = () => {
    setDayIndex(place_id, cycleDayIndex(dayIndex))
  }

  const removeTag = (t: string) => {
    setTags(
      place_id,
      tags.filter((x) => x !== t)
    )
  }

  return (
    <div
      data-testid="sources-place-row"
      className={`border-t border-paper-tertiary-fixed px-3 py-2 ${excluded ? 'opacity-40' : ''}`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`text-sm font-medium text-paper-on-surface ${excluded ? 'line-through' : ''}`}
        >
          {place.place_name}
        </span>
        <span className="paper-chip py-0.5 text-[10px] leading-tight">{place.category}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs italic text-paper-on-surface-variant">
        {place.snippet}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDayClick}
          className="rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-0.5 text-xs text-paper-on-surface"
        >
          {dayIndex === undefined ? '+ Day' : `Day ${dayIndex}`}
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {tags.map((t) => (
            <span key={t} className="paper-chip-active inline-flex items-center gap-1 py-0.5 pl-2 pr-1 text-[10px]">
              {t}
              <button
                type="button"
                className="rounded px-0.5 text-paper-on-surface-variant hover:text-white"
                aria-label={`Remove tag ${t}`}
                onClick={() => removeTag(t)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onBlur={commitTags}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitTags()
              }
            }}
            placeholder="+ tag"
            className="min-w-[4.5rem] max-w-[12rem] flex-1 rounded border border-paper-tertiary-fixed bg-paper-surface-warm px-2 py-0.5 text-xs text-paper-on-surface placeholder:text-paper-on-surface-variant focus:outline-none focus:ring-1 focus:ring-paper-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => toggleExcluded(place_id)}
          className="shrink-0 text-xs text-paper-on-surface-variant underline decoration-paper-tertiary-fixed underline-offset-2 hover:text-paper-on-surface"
        >
          {excluded ? 'Include' : 'Exclude'}
        </button>
      </div>
    </div>
  )
}

function SourceCard({ source }: { source: UserSocialSourceRow }) {
  const expandedSourceIds = useSourcesStore((s) => s.expandedSourceIds)
  const toggleExpanded = useSourcesStore((s) => s.toggleExpanded)

  const expanded = expandedSourceIds.includes(source.source_id)
  const n = source.places.length
  const title = source.title?.trim() || source.url
  const author = source.author_name?.trim()

  return (
    <div
      data-testid="sources-source-card"
      className="overflow-hidden rounded border border-paper-tertiary-fixed bg-paper-surface-container"
    >
      <button
        type="button"
        onClick={() => toggleExpanded(source.source_id)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-paper-surface-warm/80"
      >
        <span className="paper-chip shrink-0 py-1">{platformChipLabel(source.platform)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-headline text-xs font-extrabold uppercase tracking-tight text-paper-on-surface">
            {title}
          </p>
          {author ? (
            <p className="mt-0.5 truncate text-xs text-paper-on-surface-variant">@{author}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] font-medium text-paper-on-surface-variant">
          {n} place{n !== 1 ? 's' : ''}
        </span>
        <span className="shrink-0 text-paper-on-surface-variant">
          {expanded ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-paper-tertiary-fixed bg-paper-surface-warm/50">
          {source.places.map((place) => (
            <SourcePlaceRow key={place.place_id} place={place} />
          ))}
        </div>
      ) : null}
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

export default function SourcesPanel() {
  const [sources, setSources] = useState<UserSocialSourceRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const placeState = useSourcesStore((s) => s.placeState)

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

  const placeCounts = useMemo(() => {
    if (!sources) return { selected: 0, excluded: 0, total: 0 }
    let total = 0
    let excluded = 0
    for (const s of sources) {
      for (const p of s.places) {
        total += 1
        if (getPlaceStateSnapshot(placeState, p.place_id).excluded) excluded += 1
      }
    }
    const selected = total - excluded
    return { selected, excluded, total }
  }, [sources, placeState])

  const exportItems: ExportItem[] = useMemo(() => {
    if (!sources?.length) return []
    const out: ExportItem[] = []
    for (const source of sources) {
      for (const place of source.places) {
        const snap = getPlaceStateSnapshot(placeState, place.place_id)
        if (snap.excluded) continue
        out.push({
          place_id: place.place_id,
          google_place_id: place.google_place_id,
          place_name: place.place_name,
          category: place.category,
          ...(snap.day_index !== undefined ? { day_index: snap.day_index } : {}),
          tags: snap.tags,
        })
      }
    }
    return out
  }, [sources, placeState])

  const showFooter = placeCounts.selected >= 1 && placeCounts.total > 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper-surface-warm">
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
            No sources yet — paste a URL above
          </p>
        ) : (
          <div className="space-y-3 px-3 pb-4 pt-1">
            {sources.map((source) => (
              <SourceCard key={source.source_id} source={source} />
            ))}
          </div>
        )}
      </div>

      {showFooter ? (
        <div className="shrink-0 border-t border-paper-tertiary-fixed bg-paper-surface-warm px-3 py-3">
          <p className="text-xs text-paper-on-surface-variant">
            {placeCounts.selected} place{placeCounts.selected !== 1 ? 's' : ''} selected ·{' '}
            {placeCounts.excluded} excluded
          </p>
          <button
            type="button"
            data-testid="sources-export-button"
            className="paper-button-primary mt-2 w-full"
            onClick={() => setExportOpen(true)}
          >
            Export to list →
          </button>
        </div>
      ) : null}

      <SourcesExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        items={exportItems}
      />
    </div>
  )
}
