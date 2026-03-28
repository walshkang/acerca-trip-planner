'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface OnboardingTooltipProps {
  /** data-onboarding attribute value to anchor to */
  anchorId: string
  /** Tooltip body text */
  text: string
  /** Called when the tooltip is dismissed (X, timeout, or "Don't show tips") */
  onDismiss: () => void
  /** Called when user clicks "Don't show tips" */
  onDisableAll: () => void
}

type Position = { top: number; left: number; arrow: 'top' | 'bottom' }

function computePosition(anchor: DOMRect, tooltip: DOMRect): Position {
  const gap = 10
  const arrowH = 6

  // Prefer below
  const belowTop = anchor.bottom + gap + arrowH
  if (belowTop + tooltip.height < window.innerHeight - 16) {
    return {
      top: belowTop,
      left: clampX(anchor.left + anchor.width / 2 - tooltip.width / 2, tooltip.width),
      arrow: 'top',
    }
  }

  // Flip above
  const aboveTop = anchor.top - gap - arrowH - tooltip.height
  return {
    top: Math.max(16, aboveTop),
    left: clampX(anchor.left + anchor.width / 2 - tooltip.width / 2, tooltip.width),
    arrow: 'bottom',
  }
}

function clampX(x: number, width: number): number {
  const pad = 16
  return Math.max(pad, Math.min(x, window.innerWidth - width - pad))
}

export default function OnboardingTooltip({
  anchorId,
  text,
  onDismiss,
  onDisableAll,
}: OnboardingTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Position | null>(null)
  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const measure = useCallback(() => {
    const anchor = document.querySelector(`[data-onboarding="${anchorId}"]`)
    const tip = tooltipRef.current
    if (!anchor || !tip) {
      setPos(null)
      return
    }
    const anchorRect = anchor.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    setPos(computePosition(anchorRect, tipRect))
  }, [anchorId])

  // Measure on mount and on scroll/resize
  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const onScroll = () => measure()
    const onResize = () => measure()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [measure])

  // Fade in after first measure
  useEffect(() => {
    if (pos) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [pos])

  // Auto-dismiss after 8s (paused while hovering)
  useEffect(() => {
    if (hovering) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }
    timeoutRef.current = setTimeout(() => onDismiss(), 8000)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [hovering, onDismiss])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      ref={tooltipRef}
      role="status"
      aria-live="polite"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className={`fixed z-[70] max-w-[280px] rounded-[6px] border border-paper-primary/30 bg-paper-surface px-3 py-2.5 shadow-lg transition-opacity duration-200 ${
        visible && pos ? 'opacity-100' : 'opacity-0'
      }`}
      style={
        pos
          ? { top: pos.top, left: pos.left }
          : { top: -9999, left: -9999 }
      }
    >
      {/* Arrow */}
      {pos && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent ${
            pos.arrow === 'top'
              ? '-top-[12px] border-b-paper-primary/30'
              : '-bottom-[12px] border-t-paper-primary/30'
          }`}
        />
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-1.5 top-1.5 rounded-sm p-0.5 text-paper-on-surface-variant transition-colors hover:text-paper-on-surface"
        aria-label="Dismiss tip"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>

      {/* Body */}
      <p className="pr-5 text-xs leading-relaxed text-paper-on-surface">{text}</p>

      {/* Disable all link */}
      <button
        type="button"
        onClick={onDisableAll}
        className="mt-1.5 text-[10px] text-paper-on-surface-variant underline transition-colors hover:text-paper-on-surface"
      >
        Don&apos;t show tips
      </button>
    </div>,
    document.body
  )
}
