'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTripStore } from '@/lib/state/useTripStore'

type ListSummary = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

/**
 * PlannerListSwitcher — horizontal tabs for all user trips.
 *
 * Shows as many trip tabs as fit, with a "More" dropdown for overflow.
 * On mobile (<md), falls back to a single dropdown.
 */
export default function PlannerListSwitcher() {
  const activeListId = useTripStore((s) => s.activeListId)
  const setActiveListId = useTripStore((s) => s.setActiveListId)

  const [lists, setLists] = useState<ListSummary[]>([])
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState<number>(Infinity)

  const containerRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/lists')
      .then((r) => r.json())
      .then((data: { lists?: ListSummary[] }) => {
        if (!cancelled && data.lists) setLists(data.lists)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Measure how many tabs fit
  const measure = useCallback(() => {
    const container = containerRef.current
    const tabs = tabsRef.current
    if (!container || !tabs) return

    const containerWidth = container.offsetWidth
    const moreButtonWidth = 80 // reserve space for "More" button
    let totalWidth = 0
    let count = 0

    const children = tabs.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      // Temporarily show all to measure
      child.style.display = ''
      totalWidth += child.offsetWidth + 4 // 4px gap
      if (totalWidth > containerWidth - moreButtonWidth && i < lists.length - 1) {
        count = i
        break
      }
      count = i + 1
    }

    setVisibleCount(count >= lists.length ? Infinity : count)
  }, [lists.length])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setOverflowOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [overflowOpen])

  if (!lists.length) return null

  const visibleLists = visibleCount === Infinity ? lists : lists.slice(0, visibleCount)
  const overflowLists = visibleCount === Infinity ? [] : lists.slice(visibleCount)

  // Ensure active list is always visible — swap it into visible if it's in overflow
  const activeInOverflow = overflowLists.find((l) => l.id === activeListId)
  if (activeInOverflow && visibleLists.length > 0) {
    const lastVisible = visibleLists[visibleLists.length - 1]
    visibleLists[visibleLists.length - 1] = activeInOverflow
    overflowLists.splice(overflowLists.indexOf(activeInOverflow), 1, lastVisible)
  }

  const activeName = lists.find((l) => l.id === activeListId)?.name ?? 'Select a trip'

  return (
    <>
      {/* Desktop: horizontal tabs */}
      <div ref={containerRef} className="hidden md:flex md:items-center md:gap-1 md:min-w-0 md:flex-1">
        <div ref={tabsRef} className="flex items-center gap-1 min-w-0">
          {visibleLists.map((list) => {
            const isActive = list.id === activeListId
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
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
                      setActiveListId(list.id)
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
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOverflowOpen(!overflowOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <span className="text-slate-500 dark:text-slate-400">Planning:</span>
          <span className="max-w-[200px] truncate">{activeName}</span>
          <span className="material-symbols-outlined text-base leading-none">
            {overflowOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {overflowOpen && lists.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] max-h-[320px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  setActiveListId(list.id)
                  setOverflowOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700
                  ${list.id === activeListId
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300'
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
    </>
  )
}
