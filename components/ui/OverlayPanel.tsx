'use client'

import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string | null
  rightAction?: ReactNode
  onClose?: (() => void) | null
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export default function OverlayPanel({
  title,
  subtitle = null,
  rightAction,
  onClose = null,
  children,
  className = '',
  bodyClassName = '',
}: Props) {
  return (
    <section
      className={`glass-panel overflow-hidden rounded-xl text-slate-100 ${className}`}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-300">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rightAction}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-slate-100"
            >
              Close
            </button>
          ) : null}
        </div>
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

