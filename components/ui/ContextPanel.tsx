'use client'

import type { ReactNode } from 'react'
import OverlayPanel from '@/components/ui/OverlayPanel'

type Props = {
  open: boolean
  title: string
  subtitle?: string | null
  onClose: () => void
  left?: ReactNode
  right?: ReactNode
  mobileContent?: ReactNode
}

export default function ContextPanel({
  open,
  title,
  subtitle = null,
  onClose,
  left,
  right,
  mobileContent,
}: Props) {
  if (!open) return null

  return (
    <>
      {/* Mobile bottom sheet (simple v1; button-driven) */}
      <div className="fixed inset-x-0 bottom-0 z-[90] block md:hidden">
        <OverlayPanel
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          className="mx-3 mb-3 max-h-[75dvh]"
          bodyClassName="max-h-[calc(75dvh-52px)] overflow-auto"
        >
          {mobileContent}
        </OverlayPanel>
      </div>

      {/* Desktop docked panel (split view inside one container) */}
      <div className="absolute right-4 top-20 z-[60] hidden w-[min(760px,92vw)] md:block">
        <OverlayPanel
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          className="max-h-[80vh]"
          bodyClassName="max-h-[calc(80vh-52px)]"
        >
          <div className="grid h-full grid-cols-2 divide-x divide-white/10">
            <div className="min-h-0 overflow-auto">{left}</div>
            <div className="min-h-0 overflow-auto">{right}</div>
          </div>
        </OverlayPanel>
      </div>
    </>
  )
}
