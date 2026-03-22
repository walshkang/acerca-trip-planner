'use client'

import { CalendarDays, Compass } from 'lucide-react'
import { useNavStore } from '@/lib/state/useNavStore'

export default function NavFooter() {
  const mode = useNavStore((s) => s.mode)
  const setMode = useNavStore((s) => s.setMode)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] flex h-14 w-full flex-row items-stretch border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 md:hidden"
      data-testid="nav-footer"
      aria-label="Journey mode"
    >
      <button
        type="button"
        onClick={() => setMode('explore')}
        aria-current={mode === 'explore' ? 'true' : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
      >
        <span
          className={
            mode === 'explore'
              ? 'rounded-md bg-slate-100 p-1 dark:bg-slate-800'
              : 'p-1'
          }
        >
          <Compass
            className={
              mode === 'explore'
                ? 'h-5 w-5 text-slate-900 dark:text-slate-100'
                : 'h-5 w-5 text-slate-400 dark:text-slate-500'
            }
            strokeWidth={mode === 'explore' ? 2.25 : 1.75}
            aria-hidden
          />
        </span>
        <span
          className={
            mode === 'explore'
              ? 'text-[11px] font-bold leading-none text-slate-900 dark:text-slate-100'
              : 'text-[11px] font-normal leading-none text-slate-400 dark:text-slate-500'
          }
        >
          Explore
        </span>
      </button>
      <button
        type="button"
        onClick={() => setMode('plan')}
        aria-current={mode === 'plan' ? 'true' : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
      >
        <span
          className={
            mode === 'plan'
              ? 'rounded-md bg-slate-100 p-1 dark:bg-slate-800'
              : 'p-1'
          }
        >
          <CalendarDays
            className={
              mode === 'plan'
                ? 'h-5 w-5 text-slate-900 dark:text-slate-100'
                : 'h-5 w-5 text-slate-400 dark:text-slate-500'
            }
            strokeWidth={mode === 'plan' ? 2.25 : 1.75}
            aria-hidden
          />
        </span>
        <span
          className={
            mode === 'plan'
              ? 'text-[11px] font-bold leading-none text-slate-900 dark:text-slate-100'
              : 'text-[11px] font-normal leading-none text-slate-400 dark:text-slate-500'
          }
        >
          Plan
        </span>
      </button>
    </nav>
  )
}
