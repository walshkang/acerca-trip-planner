'use client'

import { type ReactNode } from 'react'

export interface PaperHeaderProps {
  /** Centered in the top row (e.g. Omnibox on Explore). */
  searchSlot?: ReactNode
  /** Second row below Map / Itinerary / search — e.g. `PlannerListSwitcher`. */
  bottomSlot?: ReactNode
  /** Tab navigation — only shown when provided */
  activeTab?: 'map' | 'itinerary'
  onTabChange?: (tab: 'map' | 'itinerary') => void
  /**
   * When true, header `right` insets by the Explore rail (~400px) + gap so the drawer stays clear.
   * Use on Explore desktop only.
   */
  clearRightRail?: boolean
}

const tabs = [
  { id: 'map' as const, label: 'Map', testId: 'paper-header-tab-map' as const },
  { id: 'itinerary' as const, label: 'Itinerary', testId: 'paper-header-tab-itinerary' as const },
] as const

function HeaderActions() {
  return (
    <>
      <button
        type="button"
        className="material-symbols-outlined rounded-[4px] p-1.5 text-xl text-paper-primary transition-colors hover:bg-paper-tertiary-fixed sm:text-[22px]"
      >
        settings
      </button>
      <button
        type="button"
        className="material-symbols-outlined rounded-[4px] p-1.5 text-xl text-paper-primary transition-colors hover:bg-paper-tertiary-fixed sm:text-[22px]"
      >
        account_circle
      </button>
    </>
  )
}

function BrandAndTabs({
  activeTab,
  onTabChange,
}: Pick<PaperHeaderProps, 'activeTab' | 'onTabChange'>) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 justify-self-start sm:gap-3">
      <span className="font-headline text-base font-black tracking-tighter text-paper-primary sm:text-lg">
        acerca
      </span>
      {activeTab && onTabChange && (
        <nav className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4" aria-label="Journey mode">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testId}
                onClick={() => onTabChange(tab.id)}
                className={`font-headline text-[10px] font-bold uppercase tracking-tight transition-colors duration-150 sm:text-xs ${
                  isActive
                    ? 'border-b-2 border-paper-primary pb-0.5 text-paper-primary'
                    : 'px-0.5 py-0.5 text-paper-on-surface opacity-70 hover:bg-paper-tertiary-fixed sm:px-1.5'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

export default function PaperHeader({
  activeTab,
  onTabChange,
  searchSlot,
  bottomSlot,
  clearRightRail = false,
}: PaperHeaderProps) {
  const hasBottom = Boolean(bottomSlot)
  const hasSearch = Boolean(searchSlot)

  return (
    <header
      className={`fixed z-50 flex flex-col gap-1.5 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface px-3 py-1.5 sm:px-4 sm:py-2 ${
        hasBottom || hasSearch ? '' : 'min-h-12 sm:min-h-14 sm:flex-row sm:items-center sm:justify-between'
      }`}
      style={{
        top: 'max(1rem, env(safe-area-inset-top, 0px))',
        left: 'max(1rem, env(safe-area-inset-left, 0px))',
        right: clearRightRail
          ? 'calc(400px + max(1rem, env(safe-area-inset-right, 0px)) + 12px)'
          : 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Top row */}
      {hasSearch ? (
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)] sm:gap-x-2">
          <BrandAndTabs activeTab={activeTab} onTabChange={onTabChange} />
          <div className="min-w-0 justify-self-center sm:w-full sm:max-w-[min(42rem,100%)]">
            {searchSlot}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1 justify-self-end sm:gap-2">
            <HeaderActions />
          </div>
        </div>
      ) : (
        <div className="flex min-h-10 w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 sm:min-h-11 sm:flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-6">
            <BrandAndTabs activeTab={activeTab} onTabChange={onTabChange} />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <HeaderActions />
          </div>
        </div>
      )}

      {hasBottom ? (
        <div className="w-full min-w-0 border-t border-paper-tertiary-fixed pt-1.5 empty:hidden empty:border-0 empty:pt-0">
          {bottomSlot}
        </div>
      ) : null}
    </header>
  )
}
