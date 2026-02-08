'use client'

import type { ReactNode } from 'react'
import OverlayPanel from '@/components/ui/OverlayPanel'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  tone?: 'light' | 'dark'
}

export default function ToolsSheet({
  open,
  onClose,
  children,
  tone = 'dark',
}: Props) {
  if (!open) return null

  const backdropClass = tone === 'dark' ? 'bg-black/40' : 'bg-slate-900/20'

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className={`absolute inset-0 ${backdropClass}`}
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:right-4 md:top-20 md:bottom-auto md:w-[min(420px,92vw)]">
        <OverlayPanel
          title="Tools"
          subtitle="Layers, base map, account."
          onClose={onClose}
          tone={tone}
          className="mx-3 mb-3 md:mx-0 md:mb-0 max-h-[75dvh] md:max-h-[80vh]"
          bodyClassName="max-h-[calc(75dvh-52px)] md:max-h-[calc(80vh-52px)] overflow-auto px-4 py-3"
        >
          {children}
        </OverlayPanel>
      </div>
    </div>
  )
}
