'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

export default function Omnibox({
  tone = 'dark',
  onCanonicalPlaceSelect,
  placeholder = 'Paste Google Maps link or search…',
  inputWidth = 'fixed',
  size = 'default',
}: {
  tone?: 'light' | 'dark'
  onCanonicalPlaceSelect?: (placeId: string) => void
  placeholder?: string
  /** `fluid`: input fills the component width (centered strip). `fixed`: legacy width. */
  inputWidth?: 'fixed' | 'fluid'
  /** Larger tap targets and type (paper Explore header). */
  size?: 'default' | 'large'
}) {
  const isDark = tone === 'dark'
  const isLarge = size === 'large'
  const query = useDiscoveryStore((s) => s.query)
  const setQuery = useDiscoveryStore((s) => s.setQuery)
  const submit = useDiscoveryStore((s) => s.submit)
  const discardAndClear = useDiscoveryStore((s) => s.discardAndClear)
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
      <div
        className={`glass-panel flex items-center rounded-full md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:shadow-none md:backdrop-blur-none ${
          isLarge ? 'gap-3 px-3 py-3 md:px-4 md:py-3.5' : 'gap-2 px-3 py-2'
        } ${inputWidth === 'fluid' ? 'w-full min-w-0' : ''}`}
      >
        <input
          className={`bg-transparent text-sm outline-none md:font-body md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant ${
            isLarge ? 'md:text-lg' : ''
          } ${inputWidth === 'fluid' ? 'min-w-0 flex-1' : 'w-[min(520px,70vw)]'} ${
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
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              discardAndClear()
            }
          }}
        />
        {query ? (
          <button
            type="button"
            onClick={discardAndClear}
            className={`glass-button text-sm md:rounded-[4px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface md:shadow-none md:backdrop-blur-none hover:md:bg-paper-tertiary-fixed ${
              isLarge ? 'px-3 py-2' : ''
            }`}
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className={`glass-button text-sm disabled:opacity-50 md:!rounded-[4px] md:!border-0 md:!bg-paper-primary md:!text-paper-on-primary md:shadow-none md:backdrop-blur-none md:font-bold md:uppercase md:tracking-widest hover:md:!bg-paper-primary-container ${
            isLarge ? 'px-6 py-2.5' : 'px-4 py-1.5 md:tracking-widest'
          } ${
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
              className="glass-panel overflow-hidden rounded-xl md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-warm md:shadow-none md:backdrop-blur-none"
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
                    className={`flex w-full flex-col gap-1 px-4 py-2 text-left text-xs md:font-body ${
                      isDark
                        ? `text-slate-100 hover:bg-white/5 ${isSelected ? 'bg-white/5' : ''}`
                        : `text-slate-900 hover:bg-slate-200/45 ${isSelected ? 'bg-slate-200/45' : ''} md:text-paper-on-surface md:hover:bg-paper-tertiary-fixed md:hover:text-paper-on-surface ${isSelected ? 'md:bg-paper-on-surface md:text-paper-surface md:hover:bg-paper-on-surface' : ''}`
                    }`}
                  >
                    <span className="font-medium">
                      {result.name ?? 'Untitled place'}
                    </span>
                    {result.address ? (
                      <span
                        className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'} md:text-paper-on-surface-variant`}
                      >
                        {result.address}
                      </span>
                    ) : null}
                    {result.neighborhood ? (
                      <span
                        className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} md:text-paper-on-surface-variant`}
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
