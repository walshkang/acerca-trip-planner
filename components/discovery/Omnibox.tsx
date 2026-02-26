'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

export default function Omnibox({
  tone = 'dark',
  onCanonicalPlaceSelect,
}: {
  tone?: 'light' | 'dark'
  onCanonicalPlaceSelect?: (placeId: string) => void
}) {
  const isDark = tone === 'dark'
  const query = useDiscoveryStore((s) => s.query)
  const setQuery = useDiscoveryStore((s) => s.setQuery)
  const submit = useDiscoveryStore((s) => s.submit)
  const clear = useDiscoveryStore((s) => s.clear)
  const isSubmitting = useDiscoveryStore((s) => s.isSubmitting)
  const error = useDiscoveryStore((s) => s.error)
  const results = useDiscoveryStore((s) => s.results)
  const selectedResultId = useDiscoveryStore((s) => s.selectedResultId)
  const setResults = useDiscoveryStore((s) => s.setResults)
  const setSelectedResultId = useDiscoveryStore((s) => s.setSelectedResultId)
  const previewResult = useDiscoveryStore((s) => s.previewResult)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useEffect(() => {
    if (!results.length) {
      setDropdownStyle(null)
      return
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [results.length])

  return (
    <div className="pointer-events-auto" ref={anchorRef}>
      <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-2">
        <input
          className={`w-[min(520px,70vw)] bg-transparent text-sm outline-none ${
            isDark
              ? 'text-slate-100 placeholder:text-slate-400'
              : 'text-slate-900 placeholder:text-slate-500'
          }`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setResults([])
            setSelectedResultId(null)
          }}
          placeholder="Paste Google Maps link or search…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              clear()
            }
          }}
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            className="glass-button"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className={`glass-button px-4 py-1.5 disabled:opacity-50 ${
            isDark
              ? 'text-slate-900 bg-slate-100/90 hover:bg-slate-100'
              : 'border-slate-900/75 bg-slate-900/90 text-slate-50 hover:bg-slate-900'
          }`}
        >
          {isSubmitting ? 'Searching…' : 'Search'}
        </button>
      </div>
      {results.length && dropdownStyle
        ? createPortal(
            <div
              data-map-tone={!isDark ? 'light' : undefined}
              className="glass-panel overflow-hidden rounded-xl"
              style={{
                position: 'fixed',
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
                zIndex: 60,
              }}
            >
              {results.map((result) => {
                const isSelected = selectedResultId === result.place_id
                return (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => {
                      if (result.canonical_place_id) {
                        setResults([])
                        setSelectedResultId(null)
                        onCanonicalPlaceSelect?.(result.canonical_place_id)
                        return
                      }
                      previewResult(result)
                    }}
                    className={`flex w-full flex-col gap-1 px-4 py-2 text-left text-xs ${
                      isDark
                        ? `text-slate-100 hover:bg-white/5 ${isSelected ? 'bg-white/5' : ''}`
                        : `text-slate-900 hover:bg-slate-200/45 ${isSelected ? 'bg-slate-200/45' : ''}`
                    }`}
                  >
                    <span className="font-medium">
                      {result.name ?? 'Untitled place'}
                    </span>
                    {result.address ? (
                      <span
                        className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                      >
                        {result.address}
                      </span>
                    ) : null}
                    {result.neighborhood ? (
                      <span
                        className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        {result.neighborhood}
                        {result.borough ? ` · ${result.borough}` : ''}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>,
            document.body
          )
        : null}
      {error ? (
        <div
          className={`mt-2 rounded-md border px-3 py-2 text-xs shadow-sm ${
            isDark
              ? 'border-red-500/40 bg-red-900/40 text-red-200'
              : 'border-red-400/60 bg-red-50/90 text-red-700'
          }`}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
