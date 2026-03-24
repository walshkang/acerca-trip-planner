'use client'

import { type ReactNode } from 'react'

export interface PaperExplorePanelProps {
  /** Location display name (e.g. "Chamonix Center") */
  locationName?: string
  /** Coordinate string (e.g. "45.9237° N, 6.8694° E") */
  coordinates?: string
  /** Category filter chips */
  filters?: { id: string; label: string; active?: boolean }[]
  onFilterChange?: (filterId: string) => void
  /** Main scrollable content (place list or place detail) */
  children?: ReactNode
  /** Footer CTA button */
  footerAction?: ReactNode
}

export default function PaperExplorePanel({
  locationName = 'Explore',
  coordinates,
  filters,
  onFilterChange,
  children,
  footerAction,
}: PaperExplorePanelProps) {
  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-paper-on-surface/10 bg-paper-surface-warm pt-24 shadow-2xl">
      {/* Header */}
      <div className="border-b border-paper-tertiary-fixed px-6 pb-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-paper-primary">
              Current Discovery
            </p>
            <h2 className="font-headline text-2xl font-black uppercase tracking-tighter text-paper-on-surface">
              {locationName}
            </h2>
          </div>
          {coordinates && (
            <span className="font-mono text-[10px] text-paper-on-surface/50">
              {coordinates}
            </span>
          )}
        </div>

        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange?.(f.id)}
                className={f.active ? 'paper-chip paper-chip-active' : 'paper-chip hover:bg-paper-tertiary-fixed'}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-paper-tertiary-fixed [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {children}
      </div>

      {/* Footer */}
      {footerAction && (
        <div className="border-t border-paper-tertiary-fixed bg-white p-6">
          {footerAction}
        </div>
      )}
    </aside>
  )
}
