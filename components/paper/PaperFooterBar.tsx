'use client'

export default function PaperFooterBar() {
  return (
    <div className="flex items-center justify-between border-t border-paper-tertiary-fixed bg-paper-surface-container-high p-4">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-paper-surface-container-highest text-[0.5rem] font-black">
            JD
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-paper-primary text-[0.5rem] font-black text-white">
            MT
          </div>
        </div>
        <span className="text-[0.65rem] font-bold text-paper-on-surface-variant">
          2 COLLABORATORS ACTIVE
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="material-symbols-outlined text-paper-on-surface-variant transition-colors hover:text-paper-primary"
        >
          print
        </button>
        <button
          type="button"
          className="material-symbols-outlined text-paper-on-surface-variant transition-colors hover:text-paper-primary"
        >
          ios_share
        </button>
        <div className="mx-2 h-6 w-px bg-paper-tertiary-fixed" />
        <button
          type="button"
          disabled
          className="rounded-[4px] bg-paper-primary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-paper-on-primary opacity-50 shadow-lg"
        >
          Generate Document
        </button>
      </div>
    </div>
  )
}
