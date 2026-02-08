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
  tone?: 'light' | 'dark'
}

export default function OverlayPanel({
  title,
  subtitle = null,
  rightAction,
  onClose = null,
  children,
  className = '',
  bodyClassName = '',
  tone = 'dark',
}: Props) {
  const isDark = tone === 'dark'
  const rootTextClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const headerBorderClass = isDark ? 'border-white/10' : 'border-slate-300/60'
  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900'
  const subtitleClass = isDark ? 'text-slate-300' : 'text-slate-600'
  const closeClass = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'

  return (
    <section
      className={`glass-panel overflow-hidden rounded-xl ${rootTextClass} ${className}`}
    >
      <header
        className={`flex items-center justify-between border-b px-4 py-3 ${headerBorderClass}`}
      >
        <div className="min-w-0">
          <h2 className={`truncate text-sm font-semibold ${titleClass}`}>
            {title}
          </h2>
          {subtitle ? (
            <p className={`mt-0.5 truncate text-xs ${subtitleClass}`}>{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rightAction}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={`text-xs ${closeClass}`}
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
