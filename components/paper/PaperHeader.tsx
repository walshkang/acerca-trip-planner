'use client'

import { type ReactNode } from 'react'

export interface PaperHeaderProps {
  /** Optional slot to render custom content in the right area */
  searchSlot?: ReactNode
  /** Tab navigation — only shown when provided */
  activeTab?: 'map' | 'itinerary'
  onTabChange?: (tab: 'map' | 'itinerary') => void
}

const tabs = [
  { id: 'map' as const, label: 'Map' },
  { id: 'itinerary' as const, label: 'Itinerary' },
] as const

export default function PaperHeader({
  activeTab,
  onTabChange,
  searchSlot,
}: PaperHeaderProps) {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 flex h-14 items-center justify-between rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface px-6">
      {/* Left: Logo + optional Nav */}
      <div className="flex items-center gap-8">
        <span className="font-headline text-xl font-black tracking-tighter text-paper-primary">
          acerca
        </span>
        {activeTab && onTabChange && (
          <nav className="hidden items-center gap-6 md:flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`font-headline text-sm font-bold uppercase tracking-tight transition-colors duration-150 ${
                    isActive
                      ? 'border-b-2 border-paper-primary pb-1 text-paper-primary'
                      : 'px-2 py-1 text-paper-on-surface opacity-70 hover:bg-paper-tertiary-fixed'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        )}
      </div>

      {/* Right: optional slot + Actions */}
      <div className="flex items-center gap-4">
        {searchSlot}
        <button
          type="button"
          className="material-symbols-outlined rounded-[4px] p-2 text-paper-primary transition-colors hover:bg-paper-tertiary-fixed"
        >
          settings
        </button>
        <button
          type="button"
          className="material-symbols-outlined rounded-[4px] p-2 text-paper-primary transition-colors hover:bg-paper-tertiary-fixed"
        >
          account_circle
        </button>
      </div>
    </header>
  )
}
