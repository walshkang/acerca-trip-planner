'use client'

import type { CSSProperties } from 'react'

export interface PaperMapControlsProps {
  onLocate?: () => void
  /** Extra classes for the control stack (default positions bottom-left). */
  className?: string
  style?: CSSProperties
}

export default function PaperMapControls({
  onLocate,
  className = '',
  style,
}: PaperMapControlsProps) {
  const btn =
    'flex h-12 w-12 items-center justify-center rounded-full border border-paper-tertiary-fixed bg-white shadow-sm transition-colors hover:bg-paper-surface-container'

  return (
    <div
      className={`absolute bottom-8 left-8 z-40 max-md:left-4 ${className}`.trim()}
      style={style}
    >
      <button type="button" className={btn} onClick={onLocate}>
        <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  )
}
