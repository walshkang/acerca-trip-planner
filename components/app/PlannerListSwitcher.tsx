'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTripStore } from '@/lib/state/useTripStore'

type ListSummary = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

type PlannerListSwitcherProps = {
  /** Label before the active trip name in the mobile dropdown (default: Planning:) */
  labelPrefix?: string
  /** Called after the store updates when the user selects a list (e.g. sync URL). */
  onListSelect?: (listId: string) => void
  /** Muted caption before the tab row (e.g. Your lists). */
  listsCaption?: string
}

function mapList(row: unknown): ListSummary | null {
  if (!row || typeof row !== 'object') return null
  const o = row as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  return {
    id: o.id,
    name: o.name,
    start_date: typeof o.start_date === 'string' ? o.start_date : null,
    end_date: typeof o.end_date === 'string' ? o.end_date : null,
  }
}

/**
 * PlannerListSwitcher — horizontal tabs for all user trips.
 *
 * Shows as many trip tabs as fit, with a "More" dropdown for overflow.
 * On mobile (<md), falls back to a single dropdown.
 */
export default function PlannerListSwitcher({
  labelPrefix = 'Planning:',
  onListSelect,
  listsCaption,
}: PlannerListSwitcherProps) {
  const activeListId = useTripStore((s) => s.activeListId)
  const setActiveListId = useTripStore((s) => s.setActiveListId)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)

  const selectList = useCallback(
    (id: string) => {
      setActiveListId(id)
      onListSelect?.(id)
    },
    [onListSelect, setActiveListId]
  )

  const [lists, setLists] = useState<ListSummary[]>([])
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState<number>(Infinity)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createPopoverOpen, setCreatePopoverOpen] = useState(false)
  const [mobileCreateExpanded, setMobileCreateExpanded] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const measureAllRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const createPopoverRef = useRef<HTMLDivElement>(null)

  const fetchLists = useCallback(() => {
    void fetch('/api/lists')
      .then((r) => r.json())
      .then((data: { lists?: unknown[] }) => {
        const raw = data.lists ?? []
        const next = raw.map(mapList).filter((x): x is ListSummary => x != null)
        setLists(next)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists, listItemsRefreshKey])

  const closeCreateUi = useCallback(() => {
    setCreatePopoverOpen(false)
    setMobileCreateExpanded(false)
    setNewListName('')
    setCreateError(null)
  }, [])

  const createList = useCallback(async () => {
    const name = newListName.trim()
    if (!name || creatingList) return
    setCreatingList(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        list?: unknown
        error?: string
      }
      if (!res.ok) {
        setCreateError(json?.error || `HTTP ${res.status}`)
        return
      }
      const list = mapList(json.list)
      if (list) {
        setLists((prev) => [...prev, list])
        selectList(list.id)
        closeCreateUi()
        useTripStore.getState().bumpListItemsRefresh()
      } else {
        fetchLists()
      }
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setCreatingList(false)
    }
  }, [closeCreateUi, creatingList, fetchLists, newListName, selectList])

  /** Off-screen row with one span per list (same typography as tab buttons) so we always measure full width. */
  const measure = useCallback(() => {
    const container = containerRef.current
    const measureRow = measureAllRef.current
    if (!container || !measureRow || lists.length === 0) return

    const containerWidth = container.offsetWidth
    if (containerWidth < 64) return

    const gap = 4
    const spans = measureRow.children
    let totalAll = 0
    for (let i = 0; i < spans.length; i++) {
      const w = (spans[i] as HTMLElement).offsetWidth
      totalAll += w + (i > 0 ? gap : 0)
    }

    if (totalAll <= containerWidth) {
      setVisibleCount(Infinity)
      return
    }

    const moreReserve = 72 + 44
    let acc = 0
    let fit = 0
    for (let i = 0; i < spans.length; i++) {
      const w = (spans[i] as HTMLElement).offsetWidth + (i > 0 ? gap : 0)
      if (acc + w + moreReserve > containerWidth) break
      acc += w
      fit = i + 1
    }

    const next = fit <= 0 ? 1 : fit >= lists.length ? Infinity : fit
    setVisibleCount(next)
  }, [lists])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    const el = containerRef.current
    const ro =
      typeof ResizeObserver !== 'undefined' && el
        ? new ResizeObserver(() => measure())
        : null
    if (el && ro) ro.observe(el)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [measure])

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (moreRef.current && !moreRef.current.contains(t)) setOverflowOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [overflowOpen])

  useEffect(() => {
    if (!createPopoverOpen) return
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (createPopoverRef.current && !createPopoverRef.current.contains(t)) {
        setCreatePopoverOpen(false)
        setNewListName('')
        setCreateError(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [createPopoverOpen])

  const createForm = (variant: 'popover' | 'inline' | 'mobile-menu') => (
    <div
      className={
        variant === 'popover'
          ? 'w-[220px] space-y-2 p-3'
          : variant === 'mobile-menu'
            ? 'space-y-2 border-t border-paper-tertiary-fixed p-3'
            : 'mt-2 space-y-2'
      }
    >
      <input
        className="w-full rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-1.5 text-sm text-paper-on-surface placeholder:text-paper-on-surface-variant"
        placeholder="List name"
        value={newListName}
        onChange={(e) => {
          setNewListName(e.target.value)
          setCreateError(null)
        }}
        disabled={creatingList}
      />
      {createError ? (
        <p className="text-[11px] text-red-600">{createError}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void createList()}
        disabled={creatingList || !newListName.trim()}
        className="w-full rounded-[4px] bg-paper-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper-on-primary disabled:opacity-50"
      >
        {creatingList ? 'Creating…' : 'Create'}
      </button>
    </div>
  )

  const plusButtonClass =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-paper-primary text-lg font-bold leading-none text-paper-on-primary transition-opacity hover:opacity-90 disabled:opacity-50'

  const caption =
    listsCaption != null && listsCaption !== '' ? (
      <span className="shrink-0 text-xs font-medium tracking-wide text-paper-on-surface-variant md:text-[11px]">
        {listsCaption}
      </span>
    ) : null

  if (!lists.length) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-2">
        {caption}
        <p className="text-xs text-paper-on-surface-variant">No lists yet.</p>
        <div ref={createPopoverRef} className="relative hidden md:block">
          <button
            type="button"
            className={plusButtonClass}
            aria-label="Create new list"
            onClick={() => {
              setCreatePopoverOpen((o) => !o)
              setCreateError(null)
            }}
          >
            +
          </button>
          {createPopoverOpen ? (
            <div className="absolute left-0 top-full z-50 mt-1 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface shadow-md">
              {createForm('popover')}
            </div>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
          {createForm('inline')}
        </div>
      </div>
    )
  }

  const visibleLists = visibleCount === Infinity ? lists : lists.slice(0, visibleCount)
  const overflowLists = visibleCount === Infinity ? [] : lists.slice(visibleCount)

  const activeInOverflow = overflowLists.find((l) => l.id === activeListId)
  if (activeInOverflow && visibleLists.length > 0) {
    const lastVisible = visibleLists[visibleLists.length - 1]
    visibleLists[visibleLists.length - 1] = activeInOverflow
    overflowLists.splice(overflowLists.indexOf(activeInOverflow), 1, lastVisible)
  }

  const activeName = lists.find((l) => l.id === activeListId)?.name ?? 'Select a trip'

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
      {caption}
      {/* Desktop: horizontal tabs */}
      <div
        ref={containerRef}
        className="relative hidden min-w-0 flex-1 md:flex md:items-center md:gap-1"
      >
        <div
          ref={measureAllRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[-1] flex gap-1 opacity-0"
          style={{ top: '-9999px' }}
        >
          {lists.map((list) => (
            <span
              key={list.id}
              className="shrink-0 whitespace-nowrap rounded-[4px] px-3 py-1.5 font-headline text-xs font-bold uppercase tracking-tight"
            >
              {list.name}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 items-center gap-1">
          {visibleLists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => selectList(list.id)}
                className={`shrink-0 rounded-[4px] px-3 py-1.5 font-headline text-xs font-bold uppercase tracking-tight transition-colors
                  ${isActive
                    ? 'bg-paper-primary text-paper-on-primary'
                    : 'text-paper-on-surface-variant hover:bg-paper-surface-container hover:text-paper-on-surface'
                  }`}
              >
                {list.name}
              </button>
            )
          })}
        </div>

        <div ref={createPopoverRef} className="relative shrink-0">
          <button
            type="button"
            className={plusButtonClass}
            aria-label="Create new list"
            onClick={() => {
              setCreatePopoverOpen((o) => !o)
              setCreateError(null)
            }}
          >
            +
          </button>
          {createPopoverOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface shadow-md">
              {createForm('popover')}
            </div>
          ) : null}
        </div>

        {overflowLists.length > 0 && (
          <div ref={moreRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOverflowOpen(!overflowOpen)}
              className="flex items-center gap-1 rounded-[4px] px-2 py-1.5 font-headline text-xs font-bold uppercase tracking-tight text-paper-on-surface-variant transition-colors hover:bg-paper-surface-container hover:text-paper-on-surface"
            >
              More
              <span className="material-symbols-outlined text-sm leading-none">
                {overflowOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {overflowOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface shadow-md">
                {overflowLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      selectList(list.id)
                      setOverflowOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-paper-surface-container
                      ${list.id === activeListId
                        ? 'font-semibold text-paper-primary'
                        : 'text-paper-on-surface'
                      }`}
                  >
                    {list.id === activeListId && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                    <span className="truncate">{list.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: single dropdown */}
      <div className="relative w-full min-w-0 md:hidden">
        <button
          type="button"
          onClick={() => {
            setOverflowOpen(!overflowOpen)
            if (overflowOpen) setMobileCreateExpanded(false)
          }}
          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-3 py-1.5 text-sm font-semibold text-paper-on-surface transition-colors hover:bg-paper-tertiary-fixed"
        >
          <span className="shrink-0 text-paper-on-surface-variant">{labelPrefix}</span>
          <span className="min-w-0 flex-1 truncate text-left">{activeName}</span>
          <span className="material-symbols-outlined shrink-0 text-base leading-none text-paper-primary">
            {overflowOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {overflowOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-[min(360px,70dvh)] w-full min-w-[220px] overflow-y-auto rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface shadow-md">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  selectList(list.id)
                  setOverflowOpen(false)
                  setMobileCreateExpanded(false)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-paper-surface-container
                  ${
                    list.id === activeListId
                      ? 'font-semibold text-paper-primary'
                      : 'text-paper-on-surface'
                  }`}
              >
                {list.id === activeListId && (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                <span className="truncate">{list.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMobileCreateExpanded((e) => !e)}
              className="flex w-full items-center gap-2 border-t border-paper-tertiary-fixed px-3 py-2 text-left text-sm font-semibold text-paper-primary hover:bg-paper-surface-container"
            >
              Create new list
              <span className="material-symbols-outlined text-sm">
                {mobileCreateExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {mobileCreateExpanded ? createForm('mobile-menu') : null}
          </div>
        )}
      </div>
    </div>
  )
}
