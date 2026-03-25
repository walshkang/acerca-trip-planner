'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { MobileSnapState } from '@/components/ui/ContextPanel'

export interface PaperExplorePanelProps {
  /** Location display name (e.g. trip name) */
  locationName?: string
  /** Optional subtitle under the title (e.g. formatted date range) */
  subtitle?: string | null
  /** Coordinate string (e.g. "45.9237° N, 6.8694° E") */
  coordinates?: string
  /** Category filter chips */
  filters?: { id: string; label: string; active?: boolean }[]
  onFilterChange?: (filterId: string) => void
  /** Main scrollable content (place list or place detail) */
  children?: ReactNode
  /** Footer CTA button */
  footerAction?: ReactNode
  /** When true, mobile sheet expands to show detail / preview content */
  preferExpanded?: boolean
  /** Mobile snap changes (for map fit padding) */
  onMobileSnapChange?: (snap: MobileSnapState) => void
}

const SNAP_HEIGHT: Record<MobileSnapState, string> = {
  peek: '120px',
  half: '50dvh',
  expanded: '85dvh',
}

function panelChrome(
  locationName: string,
  subtitle: string | null | undefined,
  coordinates: string | undefined,
  filters: PaperExplorePanelProps['filters'],
  onFilterChange: PaperExplorePanelProps['onFilterChange']
) {
  return (
    <div className="border-b border-paper-tertiary-fixed px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-0">
      <div className="mb-4 flex items-end justify-between gap-2 sm:mb-6">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-paper-primary">
            Current Discovery
          </p>
          <h2 className="font-headline text-xl font-black uppercase tracking-tighter text-paper-on-surface sm:text-2xl">
            {locationName}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-paper-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
        {coordinates ? (
          <span className="shrink-0 font-mono text-[10px] text-paper-on-surface/50">
            {coordinates}
          </span>
        ) : null}
      </div>

      {filters && filters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange?.(f.id)}
              className={
                f.active
                  ? 'paper-chip paper-chip-active'
                  : 'paper-chip hover:bg-paper-tertiary-fixed'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function PaperExplorePanel({
  locationName = 'Explore',
  subtitle = null,
  coordinates,
  filters,
  onFilterChange,
  children,
  footerAction,
  preferExpanded = false,
  onMobileSnapChange,
}: PaperExplorePanelProps) {
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('half')

  useEffect(() => {
    if (preferExpanded) {
      setMobileSnap('expanded')
    } else {
      setMobileSnap((prev) => (prev === 'expanded' ? 'half' : prev))
    }
  }, [preferExpanded])

  useEffect(() => {
    onMobileSnapChange?.(mobileSnap)
  }, [mobileSnap, onMobileSnapChange])

  const cycleSnap = useCallback(() => {
    setMobileSnap((prev) => {
      const order: MobileSnapState[] = ['peek', 'half', 'expanded']
      const i = order.indexOf(prev)
      const next = order[(i + 1) % order.length]!
      return next
    })
  }, [])

  const headerLabel =
    mobileSnap === 'peek' ? 'Tap handle to expand' : mobileSnap === 'half' ? 'Half height' : 'Expanded'

  return (
    <>
      {/* Desktop: right rail */}
      <aside
        data-testid="paper-explore-panel"
        className="fixed right-0 top-0 z-40 hidden h-full w-[400px] flex-col border-l border-paper-on-surface/10 bg-paper-surface-warm shadow-2xl md:flex"
        style={{
          paddingTop: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
        }}
      >
        {panelChrome(locationName, subtitle, coordinates, filters, onFilterChange)}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-paper-tertiary-fixed [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
          {children}
        </div>
        {footerAction ? (
          <div className="border-t border-paper-tertiary-fixed bg-white p-4 sm:p-6">{footerAction}</div>
        ) : null}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        data-testid="paper-explore-panel-mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-[4px] border border-b-0 border-paper-tertiary-fixed bg-paper-surface-warm shadow-2xl transition-[height] duration-300 ease-out md:hidden"
        style={{
          height: SNAP_HEIGHT[mobileSnap],
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          className="flex shrink-0 cursor-pointer flex-col items-center border-b border-paper-tertiary-fixed/60 py-2"
          onClick={cycleSnap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              cycleSnap()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Adjust panel height. ${headerLabel}`}
        >
          <span className="mb-1 h-1 w-10 rounded-full bg-paper-tertiary-fixed" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-paper-on-surface-variant">
            {locationName}
          </span>
        </div>
        {mobileSnap !== 'peek' ? (
          <>
            {panelChrome(locationName, subtitle, coordinates, filters, onFilterChange)}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-paper-tertiary-fixed [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
              {children}
            </div>
            {footerAction ? (
              <div className="border-t border-paper-tertiary-fixed bg-white p-4">{footerAction}</div>
            ) : null}
          </>
        ) : null}
      </aside>
    </>
  )
}
