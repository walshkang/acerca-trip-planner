'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MapPlace } from '@/components/map/MapView.types'
import type { UserSocialSourceRow } from '@/lib/social/user-sources-contract'
import {
  fetchResearchPlaces,
  type ResearchPlaceRow,
} from '@/lib/social/research-queries'
import { useResearchWorkspaceStore } from '@/lib/state/useResearchWorkspaceStore'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'

type ListRow = {
  id: string
  name: string
  list_type?: string
}

type AttachedRow = { source_id: string }

export type ViewportBounds = {
  west: number
  south: number
  east: number
  north: number
}

function buildProvenanceNotes(place: ResearchPlaceRow): string {
  const lines = place.top_snippets.slice(0, 4).map((s) => {
    const who = s.author_name?.trim() || 'Creator'
    const plat = s.platform?.trim() || 'social'
    const snip = s.snippet?.trim() || ''
    return `${who} (${plat}): ${snip}`
  })
  return lines.join('\n').slice(0, 7900)
}

function ResearchPlaceRowCard({
  place,
  researchListId,
  onVoteChange,
  onOpenTripSheet,
}: {
  place: ResearchPlaceRow
  researchListId: string
  onVoteChange: () => void
  onOpenTripSheet: (place: ResearchPlaceRow) => void
}) {
  const [busy, setBusy] = useState(false)

  const sendVote = async (value: 1 | -1 | null) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/lists/${researchListId}/research-votes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ place_id: place.place_id, vote_value: value }),
      })
      if (res.ok) onVoteChange()
    } finally {
      setBusy(false)
    }
  }

  const netNegative = place.net_score < 0
  const cardTone = netNegative ? 'opacity-75' : ''

  return (
    <div
      className={`rounded border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-3 ${cardTone}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-paper-on-surface">{place.name}</p>
          <p className="mt-1 text-[11px] text-paper-on-surface-variant">
            {place.overlap_count} source{place.overlap_count === 1 ? '' : 's'} · score{' '}
            {place.net_score > 0 ? '+' : ''}
            {place.net_score}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1">
            <button
              type="button"
              disabled={busy}
              className={`paper-button-ghost min-w-[2rem] px-2 py-0.5 text-xs ${
                place.user_vote === 1 ? 'ring-1 ring-paper-primary' : ''
              }`}
              aria-label="Vote up"
              onClick={() => void sendVote(place.user_vote === 1 ? null : 1)}
            >
              +
            </button>
            <button
              type="button"
              disabled={busy}
              className={`paper-button-ghost min-w-[2rem] px-2 py-0.5 text-xs ${
                place.user_vote === -1 ? 'ring-1 ring-paper-primary' : ''
              }`}
              aria-label="Vote down"
              onClick={() => void sendVote(place.user_vote === -1 ? null : -1)}
            >
              −
            </button>
          </div>
        </div>
      </div>
      {place.top_snippets.length ? (
        <p className="mt-2 line-clamp-2 text-xs italic text-paper-on-surface-variant">
          &ldquo;{place.top_snippets[0]!.snippet}&rdquo;
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="paper-button-primary px-2 py-1 text-xs"
          onClick={() => onOpenTripSheet(place)}
        >
          Add to trip
        </button>
      </div>
    </div>
  )
}

type ResearchTriagePanelProps = {
  userSources: UserSocialSourceRow[] | null
  onResearchMapPlacesChange: (places: MapPlace[]) => void
  researchListId: string | null
  onResearchListIdChange: (id: string | null) => void
  /** Increment from parent when user clicks &quot;Search this area&quot; */
  searchThisAreaTick: number
}

export default function ResearchTriagePanel({
  userSources,
  onResearchMapPlacesChange,
  researchListId,
  onResearchListIdChange,
  searchThisAreaTick,
}: ResearchTriagePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const markSearchAreaFresh = useResearchWorkspaceStore((s) => s.markSearchAreaFresh)

  const [lists, setLists] = useState<ListRow[]>([])
  const [tripLists, setTripLists] = useState<ListRow[]>([])
  const [attached, setAttached] = useState<AttachedRow[]>([])
  const [researchPlaces, setResearchPlaces] = useState<ResearchPlaceRow[]>([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [newResearchName, setNewResearchName] = useState('')
  const [creating, setCreating] = useState(false)
  const [tripSheetPlace, setTripSheetPlace] = useState<ResearchPlaceRow | null>(null)
  const [addingTripId, setAddingTripId] = useState<string | null>(null)
  const [lastQueryBounds, setLastQueryBounds] = useState<ViewportBounds | null | 'full'>(
    'full'
  )

  const loadLists = useCallback(async () => {
    setLoadingLists(true)
    try {
      const res = await fetch('/api/lists')
      const json = (await res.json().catch(() => ({}))) as { lists?: unknown[] }
      if (!res.ok) return
      const raw = (json.lists ?? []) as ListRow[]
      setLists(raw)
      setTripLists(raw.filter((l) => (l.list_type ?? 'trip') === 'trip'))
    } finally {
      setLoadingLists(false)
    }
  }, [])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  const researchLists = useMemo(
    () => lists.filter((l) => l.list_type === 'research'),
    [lists]
  )

  const loadAttached = useCallback(async (listId: string) => {
    const res = await fetch(`/api/lists/${listId}/sources`)
    if (!res.ok) {
      setAttached([])
      return
    }
    const json = (await res.json()) as { sources?: AttachedRow[] }
    setAttached(json.sources ?? [])
  }, [])

  useEffect(() => {
    if (!researchListId) {
      setAttached([])
      return
    }
    void loadAttached(researchListId)
  }, [researchListId, loadAttached])

  const applyPlacesToMap = useCallback(
    (data: ResearchPlaceRow[]) => {
      const mapPlaces: MapPlace[] = data
        .filter((p) => CATEGORY_ENUM_VALUES.includes(p.category as CategoryEnum))
        .map((p) => ({
          id: p.place_id,
          name: p.name,
          category: p.category as CategoryEnum,
          lat: p.lat,
          lng: p.lng,
          overlapCount: p.overlap_count,
          researchDeemphasize: p.net_score < 0,
        }))
      onResearchMapPlacesChange(mapPlaces)
    },
    [onResearchMapPlacesChange]
  )

  const fetchPlaces = useCallback(
    async (bounds: ViewportBounds | null) => {
      if (!researchListId) {
        setResearchPlaces([])
        onResearchMapPlacesChange([])
        return
      }
      setLoadingPlaces(true)
      setPlacesError(null)
      try {
        const { data, error } = await fetchResearchPlaces({
          listId: researchListId,
          bounds,
        })
        if (error) {
          setPlacesError(error)
          setResearchPlaces([])
          onResearchMapPlacesChange([])
          return
        }
        setResearchPlaces(data)
        applyPlacesToMap(data)
        setLastQueryBounds(bounds === null ? 'full' : bounds)
      } finally {
        setLoadingPlaces(false)
      }
    },
    [applyPlacesToMap, onResearchMapPlacesChange, researchListId]
  )

  useEffect(() => {
    setLastQueryBounds('full')
    void fetchPlaces(null)
  }, [fetchPlaces, researchListId])

  useEffect(() => {
    if (searchThisAreaTick === 0) return
    const b = useResearchWorkspaceStore.getState().viewportBounds
    if (!b || !researchListId) return
    void fetchPlaces(b)
    markSearchAreaFresh()
  }, [searchThisAreaTick, researchListId, fetchPlaces, markSearchAreaFresh])

  const refetchAfterVote = useCallback(() => {
    if (lastQueryBounds === 'full') void fetchPlaces(null)
    else if (lastQueryBounds) void fetchPlaces(lastQueryBounds)
    else void fetchPlaces(null)
  }, [fetchPlaces, lastQueryBounds])

  const attachedSet = useMemo(
    () => new Set(attached.map((a) => a.source_id)),
    [attached]
  )

  async function createResearchList() {
    const name = newResearchName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, list_type: 'research' }),
      })
      const json = (await res.json().catch(() => ({}))) as { list?: ListRow; error?: string }
      if (!res.ok) return
      if (json.list?.id) {
        await loadLists()
        onResearchListIdChange(json.list.id)
        setNewResearchName('')
      }
    } finally {
      setCreating(false)
    }
  }

  const toggleSourceAttached = useCallback(
    async (sourceId: string, isOn: boolean) => {
      if (!researchListId) return
      if (isOn) {
        const res = await fetch(`/api/lists/${researchListId}/sources`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source_id: sourceId }),
        })
        if (res.ok) {
          await loadAttached(researchListId)
          refetchAfterVote()
        }
        return
      }
      const res = await fetch(`/api/lists/${researchListId}/sources/${sourceId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadAttached(researchListId)
        refetchAfterVote()
      }
    },
    [loadAttached, refetchAfterVote, researchListId]
  )

  async function addPlaceToTrip(tripListId: string, place: ResearchPlaceRow) {
    setAddingTripId(tripListId)
    try {
      const notes = buildProvenanceNotes(place)
      const res = await fetch(`/api/lists/${tripListId}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          place_id: place.place_id,
          notes: notes.length ? notes : undefined,
          include_automatic_tags: false,
        }),
      })
      if (res.ok) setTripSheetPlace(null)
    } finally {
      setAddingTripId(null)
    }
  }

  function handleToggle() {
    if (isOpen) {
      onResearchListIdChange(null)
      onResearchMapPlacesChange([])
    }
    setIsOpen((v) => !v)
  }

  return (
    <div className="border-b border-paper-tertiary-fixed">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-on-surface-variant">
          Research overlap
        </span>
        <span className="text-paper-on-surface-variant" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen ? (
      <div className="px-3 pb-3">
      <p className="text-xs text-paper-on-surface-variant">
        Attach ingested sources to a research list, then triage overlapping places. Use Search
        this area on the map to filter by viewport.
      </p>

      {loadingLists ? (
        <p className="mt-2 text-xs text-paper-on-surface-variant">Loading lists…</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            <label
              htmlFor="research-list-select"
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-on-surface-variant"
            >
              Research list
            </label>
            <select
              id="research-list-select"
              data-testid="research-list-select"
              className="mt-1 w-full rounded border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1.5 text-sm"
              value={researchListId ?? ''}
              onChange={(e) =>
                onResearchListIdChange(e.target.value ? e.target.value : null)
              }
            >
              <option value="">Select a research list…</option>
              {researchLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New research list"
                value={newResearchName}
                onChange={(e) => setNewResearchName(e.target.value)}
                className="min-w-0 flex-1 rounded border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                className="paper-button-primary shrink-0 px-2 py-1.5 text-xs"
                disabled={creating || !newResearchName.trim()}
                onClick={() => void createResearchList()}
              >
                Create
              </button>
            </div>
          </div>

          {researchListId && userSources?.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper-on-surface-variant">
                Attached sources
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
                {userSources.map((s) => (
                  <li key={s.source_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={attachedSet.has(s.source_id)}
                      onChange={(e) =>
                        void toggleSourceAttached(s.source_id, e.target.checked)
                      }
                      id={`attach-${s.source_id}`}
                    />
                    <label htmlFor={`attach-${s.source_id}`} className="truncate">
                      {s.title?.trim() || s.url}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {researchListId ? (
            <div className="mt-4 space-y-2">
              {placesError ? (
                <p className="text-xs text-red-600">{placesError}</p>
              ) : null}
              {loadingPlaces ? (
                <p className="text-xs text-paper-on-surface-variant">Loading places…</p>
              ) : researchPlaces.length === 0 ? (
                <p className="text-xs text-paper-on-surface-variant">
                  No overlapping places yet. Attach sources that mention the same places, or
                  search a denser map area.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {researchPlaces.map((p) => (
                    <ResearchPlaceRowCard
                      key={p.place_id}
                      place={p}
                      researchListId={researchListId}
                      onVoteChange={() => void refetchAfterVote()}
                      onOpenTripSheet={setTripSheetPlace}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {tripSheetPlace ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose trip list"
        >
          <div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded border border-paper-tertiary-fixed bg-paper-surface-warm shadow-lg">
            <div className="border-b border-paper-tertiary-fixed px-4 py-3">
              <p className="text-sm font-medium text-paper-on-surface">Add to trip</p>
              <p className="mt-1 truncate text-xs text-paper-on-surface-variant">
                {tripSheetPlace.name}
              </p>
            </div>
            <ul className="max-h-56 overflow-y-auto p-2">
              {tripLists.length === 0 ? (
                <li className="px-2 py-3 text-xs text-paper-on-surface-variant">
                  Create a trip list from Map or Itinerary first.
                </li>
              ) : (
                tripLists.map((t) => (
                  <li key={t.id} className="border-b border-paper-tertiary-fixed/50 last:border-0">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-paper-surface-container"
                      disabled={addingTripId !== null}
                      onClick={() => void addPlaceToTrip(t.id, tripSheetPlace)}
                    >
                      <span className="truncate">{t.name}</span>
                      {addingTripId === t.id ? (
                        <span className="text-xs text-paper-on-surface-variant">…</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-paper-tertiary-fixed p-2">
              <button
                type="button"
                className="paper-button-ghost w-full py-2 text-sm"
                onClick={() => setTripSheetPlace(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
      ) : null}
    </div>
  )
}
