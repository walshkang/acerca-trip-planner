'use client'

import { CalendarDays, Compass } from 'lucide-react'
import { useNavStore } from '@/lib/state/useNavStore'

export default function NavRail() {
  const mode = useNavStore((s) => s.mode)
  const setMode = useNavStore((s) => s.setMode)

  return (
    <nav
      className="hidden h-full w-14 shrink-0 flex-col items-center justify-center gap-6 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:flex"
      data-testid="nav-rail"
      aria-label="Journey mode"
    >
      <button
        type="button"
        onClick={() => setMode('explore')}
        aria-current={mode === 'explore' ? 'true' : undefined}
        className="flex flex-col items-center gap-1 rounded-lg px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900"
      >
        <span
          className={
            mode === 'explore'
              ? 'rounded-md bg-slate-100 p-1.5 dark:bg-slate-800'
              : 'p-1.5'
          }
        >
          <Compass
            className={
              mode === 'explore'
                ? 'h-6 w-6 text-slate-900 dark:text-slate-100'
                : 'h-6 w-6 text-slate-400 dark:text-slate-500'
            }
            strokeWidth={mode === 'explore' ? 2.25 : 1.75}
            aria-hidden
          />
        </span>
        <span
          className={
            mode === 'explore'
              ? 'text-xs font-bold text-slate-900 dark:text-slate-100'
              : 'text-xs font-normal text-slate-400 dark:text-slate-500'
          }
        >
          Explore
        </span>
      </button>
      <button
        type="button"
        onClick={() => setMode('plan')}
        aria-current={mode === 'plan' ? 'true' : undefined}
        className="flex flex-col items-center gap-1 rounded-lg px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900"
      >
        <span
          className={
            mode === 'plan'
              ? 'rounded-md bg-slate-100 p-1.5 dark:bg-slate-800'
              : 'p-1.5'
          }
        >
          <CalendarDays
            className={
              mode === 'plan'
                ? 'h-6 w-6 text-slate-900 dark:text-slate-100'
                : 'h-6 w-6 text-slate-400 dark:text-slate-500'
            }
            strokeWidth={mode === 'plan' ? 2.25 : 1.75}
            aria-hidden
          />
        </span>
        <span
          className={
            mode === 'plan'
              ? 'text-xs font-bold text-slate-900 dark:text-slate-100'
              : 'text-xs font-normal text-slate-400 dark:text-slate-500'
          }
        >
          Plan
        </span>
      </button>
    </nav>
  )
}
