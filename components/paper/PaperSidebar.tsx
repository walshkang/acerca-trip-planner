'use client'

export interface PaperSidebarNavItem {
  id: string
  label: string
  icon: string
  active?: boolean
  onClick?: () => void
}

export interface PaperSidebarProps {
  projectTitle?: string
  subtitle?: string
  navItems: PaperSidebarNavItem[]
  onNewEntry?: () => void
}

export default function PaperSidebar({
  projectTitle = 'Trip',
  subtitle,
  navItems,
  onNewEntry,
}: PaperSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-paper-tertiary-fixed bg-paper-surface-container-low pb-6 pt-24">
      {/* Project header */}
      <div className="mb-8 px-6">
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-paper-on-surface">
          {projectTitle}
        </h2>
        {subtitle && (
          <p className="font-body text-[0.7rem] font-medium text-paper-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-[4px] px-3 py-2 font-body text-[0.75rem] font-medium transition-all ${
              item.active
                ? 'bg-paper-primary text-paper-on-primary'
                : 'text-paper-on-surface opacity-80 hover:bg-paper-tertiary-fixed'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto space-y-4 px-4">
        {onNewEntry && (
          <button
            type="button"
            onClick={onNewEntry}
            className="paper-button-primary flex w-full items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Entry
          </button>
        )}
        <div className="flex flex-col gap-1 border-t border-paper-tertiary-fixed pt-4">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-1.5 text-[0.75rem] text-paper-on-surface-variant hover:text-paper-on-surface"
          >
            <span className="material-symbols-outlined text-lg">
              help_outline
            </span>
            Support
          </a>
        </div>
      </div>
    </aside>
  )
}
