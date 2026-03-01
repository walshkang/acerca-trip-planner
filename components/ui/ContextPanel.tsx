'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import OverlayPanel from '@/components/ui/OverlayPanel'

/* ── Snap-point helpers ───────────────────────────────────────── */

const DESKTOP_SNAPS = [360, 520, 760] as const

function nearestSnap(value: number, snaps: readonly number[]): number {
  let best = snaps[0]
  let bestDist = Math.abs(value - best)
  for (const s of snaps) {
    const d = Math.abs(value - s)
    if (d < bestDist) {
      best = s
      bestDist = d
    }
  }
  return best
}

export type MobileSnapState = 'peek' | 'half' | 'expanded'

const MOBILE_SNAP_CSS: Record<MobileSnapState, string> = {
  peek: '120px',
  half: '50dvh',
  expanded: '85dvh',
}

function mobileSnapFromPx(px: number, vh: number): MobileSnapState | null {
  if (px < 80) return null // signal close
  const targets: [MobileSnapState, number][] = [
    ['peek', 120],
    ['half', vh * 0.5],
    ['expanded', vh * 0.85],
  ]
  let best: MobileSnapState = 'half'
  let bestDist = Infinity
  for (const [snap, h] of targets) {
    const d = Math.abs(px - h)
    if (d < bestDist) {
      best = snap
      bestDist = d
    }
  }
  return best
}

/* ── Component ────────────────────────────────────────────────── */

type Props = {
  open: boolean
  title: string
  subtitle?: string | null
  onClose: () => void
  tone?: 'light' | 'dark'
  desktopLayout?: 'split' | 'single'
  left?: ReactNode
  right?: ReactNode
  desktopContent?: ReactNode
  mobileContent?: ReactNode
  /** Desktop panel width in px (controlled). */
  desktopWidth?: number
  onDesktopWidthChange?: (width: number) => void
  /** Mobile bottom-sheet snap state (controlled). */
  mobileSnap?: MobileSnapState
  onMobileSnapChange?: (snap: MobileSnapState) => void
}

export default function ContextPanel({
  open,
  title,
  subtitle = null,
  onClose,
  tone = 'dark',
  desktopLayout = 'split',
  left,
  right,
  desktopContent,
  mobileContent,
  desktopWidth = 760,
  onDesktopWidthChange,
  mobileSnap = 'half',
  onMobileSnapChange,
}: Props) {
  /* ── Reduced-motion preference ──────────────────────────────── */
  const reducedMotion = useRef(false)
  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  /* ── Desktop drag-to-resize ────────────────────────────────── */
  const dragMeta = useRef<{ startX: number; startW: number } | null>(null)
  const liveWidthRef = useRef(desktopWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [liveWidth, setLiveWidth] = useState(desktopWidth)

  useEffect(() => {
    if (!isDragging) {
      setLiveWidth(desktopWidth)
      liveWidthRef.current = desktopWidth
    }
  }, [desktopWidth, isDragging])

  const onHandleDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragMeta.current = { startX: e.clientX, startW: desktopWidth }
      setIsDragging(true)
    },
    [desktopWidth]
  )

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragMeta.current) return
      const delta = dragMeta.current.startX - e.clientX
      const w = Math.max(320, Math.min(800, dragMeta.current.startW + delta))
      liveWidthRef.current = w
      setLiveWidth(w)
    }
    const onUp = () => {
      const snapped = nearestSnap(liveWidthRef.current, DESKTOP_SNAPS)
      liveWidthRef.current = snapped
      setLiveWidth(snapped)
      setIsDragging(false)
      dragMeta.current = null
      onDesktopWidthChange?.(snapped)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, onDesktopWidthChange])

  /* ── Mobile sheet drag ──────────────────────────────────────── */
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchMeta = useRef<{ startY: number; startH: number } | null>(null)
  const liveSheetHRef = useRef<number | null>(null)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const [liveSheetH, setLiveSheetH] = useState<number | null>(null)

  const onGrabStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    const h =
      sheetRef.current?.getBoundingClientRect().height ??
      window.innerHeight * 0.5
    touchMeta.current = { startY: t.clientY, startH: h }
    setIsDraggingSheet(true)
  }, [])

  useEffect(() => {
    if (!isDraggingSheet) return
    const onTouchMove = (e: TouchEvent) => {
      if (!touchMeta.current) return
      const t = e.touches[0]
      const delta = touchMeta.current.startY - t.clientY
      const h = Math.max(
        60,
        Math.min(window.innerHeight * 0.92, touchMeta.current.startH + delta)
      )
      liveSheetHRef.current = h
      setLiveSheetH(h)
    }
    const onTouchEnd = () => {
      const h = liveSheetHRef.current
      liveSheetHRef.current = null
      setLiveSheetH(null)
      setIsDraggingSheet(false)
      touchMeta.current = null
      if (h == null) return
      const snap = mobileSnapFromPx(h, window.innerHeight)
      if (snap) onMobileSnapChange?.(snap)
      else onClose()
    }
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDraggingSheet, onClose, onMobileSnapChange])

  /* ── Early exit (after all hooks) ───────────────────────────── */
  if (!open) return null

  /* ── Tone classes ───────────────────────────────────────────── */
  const isDark = tone === 'dark'
  const rootText = isDark ? 'text-slate-100' : 'text-slate-900'
  const headerBorder = isDark ? 'border-white/10' : 'border-slate-300/60'
  const titleCls = isDark ? 'text-slate-100' : 'text-slate-900'
  const subtitleCls = isDark ? 'text-slate-300' : 'text-slate-600'
  const closeCls = isDark
    ? 'text-slate-300 hover:text-slate-100'
    : 'text-slate-600 hover:text-slate-900'
  const divideClass = isDark ? 'divide-white/10' : 'divide-slate-300/60'
  const handleBar = isDark ? 'bg-slate-500' : 'bg-slate-400'
  const handleHover = isDark ? 'hover:bg-sky-400/15' : 'hover:bg-sky-500/10'

  /* ── Desktop computed ───────────────────────────────────────── */
  const effectiveLayout = liveWidth < 480 ? 'single' : desktopLayout
  const desktopTransition = reducedMotion.current
    ? 'none'
    : 'width 0.2s ease'
  const desktopStyle: React.CSSProperties = {
    width: `min(${liveWidth}px, 92vw)`,
    transition: isDragging ? 'none' : desktopTransition,
  }

  /* ── Mobile computed ────────────────────────────────────────── */
  const sheetTransition = reducedMotion.current
    ? 'none'
    : 'height 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
  const mobileStyle: React.CSSProperties =
    isDraggingSheet && liveSheetH != null
      ? { height: `${liveSheetH}px`, transition: 'none' }
      : { height: MOBILE_SNAP_CSS[mobileSnap], transition: sheetTransition }

  return (
    <>
      {/* ── Mobile bottom sheet ─────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-[90] block md:hidden">
        <section
          ref={sheetRef}
          className={`glass-panel mx-3 mb-3 flex flex-col overflow-hidden rounded-xl ${rootText}`}
          style={mobileStyle}
        >
          {/* Grab bar */}
          <div
            className="flex shrink-0 cursor-grab items-center justify-center py-2 active:cursor-grabbing"
            onTouchStart={onGrabStart}
            role="separator"
            aria-orientation="horizontal"
          >
            <div className={`h-1 w-8 rounded-full ${handleBar}`} />
          </div>

          {/* Header (matches OverlayPanel styling) */}
          <header
            className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${headerBorder}`}
          >
            <div className="min-w-0">
              <h2 className={`truncate text-sm font-semibold ${titleCls}`}>
                {title}
              </h2>
              {subtitle ? (
                <p className={`mt-0.5 truncate text-xs ${subtitleCls}`}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 text-xs ${closeCls}`}
            >
              Close
            </button>
          </header>

          {/* Body — flex-1 fills remaining height naturally */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mobileContent}
          </div>
        </section>
      </div>

      {/* ── Desktop docked panel ────────────────────────────── */}
      <div
        className="absolute right-4 top-20 z-[60] hidden md:block"
        style={desktopStyle}
      >
        {/* Drag handle on left edge */}
        <div
          className={`absolute -left-1.5 top-0 bottom-0 z-10 w-3 cursor-col-resize rounded-l-md transition-colors ${
            isDragging ? 'bg-sky-500/20' : handleHover
          }`}
          onMouseDown={onHandleDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize workspace panel"
        />

        <OverlayPanel
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          tone={tone}
          className="max-h-[80vh]"
          bodyClassName="h-[calc(80vh-52px)]"
        >
          {effectiveLayout === 'single' ? (
            <div className="h-full overflow-auto">
              {desktopContent ?? right ?? left ?? null}
            </div>
          ) : (
            <div
              className={`grid h-full grid-cols-2 divide-x ${divideClass}`}
            >
              <div className="min-h-0 overflow-auto">{left}</div>
              <div className="min-h-0 overflow-auto">{right}</div>
            </div>
          )}
        </OverlayPanel>
      </div>
    </>
  )
}
