'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import EmojiPicker from '@/components/ui/EmojiPicker'
import type { MobileSnapState } from '@/lib/ui/mobileSnapState'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import { CATEGORY_ICON_CHOICES } from '@/lib/icons/preferences'
import { isCategoryEnum } from '@/lib/lists/filters'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'

export interface PaperExplorePanelProps {
  /** Location display name (e.g. trip name) */
  locationName?: string
  /** Optional subtitle under the title (e.g. formatted date range) */
  subtitle?: string | null
  /** Coordinate string (e.g. "45.9237° N, 6.8694° E") */
  coordinates?: string
  /** Active list (for per-list emoji overrides) */
  activeListId?: string | null
  /** Category filter chips */
  filters?: { id: string; label: string; active?: boolean }[]
  onFilterChange?: (filterId: string) => void
  /** Tag filter chips */
  tags?: { id: string; label: string; active?: boolean }[]
  onTagChange?: (tagId: string) => void
  /** Main scrollable content (place list or place detail) */
  children?: ReactNode
  /** Footer CTA button */
  footerAction?: ReactNode
  /** When true, mobile sheet expands to show detail / preview content */
  preferExpanded?: boolean
  /** Mobile snap changes (for map fit padding) */
  onMobileSnapChange?: (snap: MobileSnapState) => void
}

const SNAP_HEIGHT: Record<MobileSnapState, string> = {
  peek: '120px',
  half: '50dvh',
  expanded: '85dvh',
}

const SECTION_HEADING =
  'text-[10px] font-bold uppercase tracking-[0.2em] text-paper-on-surface-variant'

type ChromeProps = {
  locationName: string
  subtitle: string | null | undefined
  coordinates: string | undefined
  filters: PaperExplorePanelProps['filters']
  onFilterChange: PaperExplorePanelProps['onFilterChange']
  tags: PaperExplorePanelProps['tags']
  onTagChange: PaperExplorePanelProps['onTagChange']
  activeListId: string | null | undefined
}

function PaperExplorePanelChrome({
  locationName,
  subtitle,
  coordinates,
  filters,
  onFilterChange,
  tags,
  onTagChange,
  activeListId,
}: ChromeProps) {
  const {
    categoryIconOverrides,
    setCategoryIcon,
    resetCategoryIcons,
    resolveCategoryEmoji,
  } = useCategoryIconOverrides(activeListId ?? null)
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false)
  const [pickerCategory, setPickerCategory] = useState<CategoryEnum | null>(null)

  useEffect(() => {
    setEmojiPanelOpen(false)
    setPickerCategory(null)
  }, [activeListId])

  const hasCustomListIcons = Object.keys(categoryIconOverrides).length > 0
  const showTypeRow = Boolean(filters && filters.length > 0)
  const showTagRow = Boolean(tags && tags.length > 0)

  return (
    <div className="border-b border-paper-tertiary-fixed px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-0">
      <div className="mb-4 flex items-end justify-between gap-2 sm:mb-6">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-paper-primary">
            Current Discovery
          </p>
          <h2 className="font-headline text-xl font-black uppercase tracking-tighter text-paper-on-surface sm:text-2xl">
            {locationName}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-paper-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
        {coordinates ? (
          <span className="shrink-0 font-mono text-[10px] text-paper-on-surface/50">
            {coordinates}
          </span>
        ) : null}
      </div>

      {showTypeRow ? (
        <div className="space-y-2">
          <p className={SECTION_HEADING}>Types</p>
          <div className="flex flex-wrap gap-2">
            {filters!.map((f) => {
              const cat = isCategoryEnum(f.id) ? f.id : null
              const chipLabel =
                cat != null
                  ? `${resolveCategoryEmoji(cat)} ${f.label}`
                  : f.label
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFilterChange?.(f.id)}
                  className={
                    f.active
                      ? 'paper-chip paper-chip-active'
                      : 'paper-chip hover:bg-paper-tertiary-fixed'
                  }
                >
                  {chipLabel}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setEmojiPanelOpen((o) => !o)}
            className="text-[11px] text-paper-on-surface-variant hover:text-paper-primary cursor-pointer"
          >
            Change emojis {emojiPanelOpen ? '▴' : '▾'}
          </button>
          {emojiPanelOpen ? (
            <div className="mt-2 space-y-2 rounded-md border border-paper-tertiary-fixed bg-paper-surface-container-low p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-paper-on-surface">
                  Type icons (this list)
                </p>
                {hasCustomListIcons ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetCategoryIcons()
                      setPickerCategory(null)
                    }}
                    className="text-[11px] text-paper-on-surface-variant underline"
                  >
                    Reset list
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-paper-on-surface-variant">
                Click Change to open emoji input for each category.
              </p>
              <div className="space-y-2">
                {CATEGORY_ENUM_VALUES.map((category) => {
                  const isPicking = pickerCategory === category
                  const hasOverride = Boolean(categoryIconOverrides[category])
                  return (
                    <div
                      key={`panel-icon-${category}`}
                      className={`rounded-md border px-2 py-2 ${
                        isPicking
                          ? 'border-sky-400/60 bg-sky-100/80'
                          : 'border-paper-tertiary-fixed bg-white/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-paper-on-surface">
                          <span aria-hidden className="text-base leading-none">
                            {resolveCategoryEmoji(category)}
                          </span>
                          <span className="font-medium">{category}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPickerCategory(category)}
                            className="rounded-md border border-paper-tertiary-fixed px-2 py-1 text-[11px] text-paper-on-surface hover:bg-paper-tertiary-fixed"
                          >
                            {isPicking ? 'Picking…' : 'Change'}
                          </button>
                          {hasOverride ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryIcon(category, null)
                                if (pickerCategory === category) setPickerCategory(null)
                              }}
                              className="text-[11px] text-paper-on-surface-variant underline"
                            >
                              Default
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showTagRow ? (
        <div className={showTypeRow ? 'mt-4 space-y-2' : 'space-y-2'}>
          <p className={SECTION_HEADING}>Tags</p>
          <div className="flex max-h-[3.5rem] flex-wrap gap-2 overflow-y-auto">
            {tags!.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTagChange?.(t.id)}
                className={
                  t.active
                    ? 'paper-chip paper-chip-active'
                    : 'paper-chip hover:bg-paper-tertiary-fixed'
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <EmojiPicker
        open={Boolean(emojiPanelOpen && pickerCategory)}
        title={
          pickerCategory ? `Choose icon for ${pickerCategory}` : 'Choose icon'
        }
        suggestedEmojis={
          pickerCategory ? [...CATEGORY_ICON_CHOICES[pickerCategory]] : []
        }
        includeCatalog={false}
        restrictToOptions={false}
        onClose={() => setPickerCategory(null)}
        onSelect={(emoji) => {
          if (!pickerCategory) return
          setCategoryIcon(pickerCategory, emoji)
          setPickerCategory(null)
        }}
      />
    </div>
  )
}

export default function PaperExplorePanel({
  locationName = 'Explore',
  subtitle = null,
  coordinates,
  activeListId = null,
  filters,
  onFilterChange,
  tags,
  onTagChange,
  children,
  footerAction,
  preferExpanded = false,
  onMobileSnapChange,
}: PaperExplorePanelProps) {
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('half')

  useEffect(() => {
    if (preferExpanded) {
      setMobileSnap('expanded')
    } else {
      setMobileSnap((prev) => (prev === 'expanded' ? 'half' : prev))
    }
  }, [preferExpanded])

  useEffect(() => {
    onMobileSnapChange?.(mobileSnap)
  }, [mobileSnap, onMobileSnapChange])

  const cycleSnap = useCallback(() => {
    setMobileSnap((prev) => {
      const order: MobileSnapState[] = ['peek', 'half', 'expanded']
      const i = order.indexOf(prev)
      const next = order[(i + 1) % order.length]!
      return next
    })
  }, [])

  const headerLabel =
    mobileSnap === 'peek' ? 'Tap handle to expand' : mobileSnap === 'half' ? 'Half height' : 'Expanded'

  const chromeProps: ChromeProps = {
    locationName,
    subtitle,
    coordinates,
    filters,
    onFilterChange,
    tags,
    onTagChange,
    activeListId,
  }

  return (
    <>
      {/* Desktop: right rail */}
      <aside
        data-testid="paper-explore-panel"
        className="fixed right-0 top-0 z-40 hidden h-full w-[400px] flex-col border-l border-paper-on-surface/10 bg-paper-surface-warm shadow-2xl md:flex"
        style={{
          paddingTop: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
        }}
      >
        <PaperExplorePanelChrome key="desktop-chrome" {...chromeProps} />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-paper-tertiary-fixed [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
          {children}
        </div>
        {footerAction ? (
          <div className="border-t border-paper-tertiary-fixed bg-white p-4 sm:p-6">{footerAction}</div>
        ) : null}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        data-testid="paper-explore-panel-mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-[4px] border border-b-0 border-paper-tertiary-fixed bg-paper-surface-warm shadow-2xl transition-[height] duration-300 ease-out md:hidden"
        style={{
          height: SNAP_HEIGHT[mobileSnap],
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          className="flex shrink-0 cursor-pointer flex-col items-center border-b border-paper-tertiary-fixed/60 py-2"
          onClick={cycleSnap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              cycleSnap()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Adjust panel height. ${headerLabel}`}
        >
          <span className="mb-1 h-1 w-10 rounded-full bg-paper-tertiary-fixed" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-paper-on-surface-variant">
            {locationName}
          </span>
        </div>
        {mobileSnap !== 'peek' ? (
          <>
            <PaperExplorePanelChrome key="mobile-chrome" {...chromeProps} />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-paper-tertiary-fixed [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
              {children}
            </div>
            {footerAction ? (
              <div className="border-t border-paper-tertiary-fixed bg-white p-4">{footerAction}</div>
            ) : null}
          </>
        ) : null}
      </aside>
    </>
  )
}
