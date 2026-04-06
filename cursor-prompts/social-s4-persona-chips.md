# Social Discovery S4.2 — Persona Toggle Chips

## What to build

A horizontal scrollable row of toggle chips, one per persona, that filters which social places appear on the map. Renders inside `PaperExplorePanel` above the existing list/place content, visible only in Explore mode.

Multi-select. When no chips are selected = all personas shown. When one or more chips are active = only places from those personas shown.

## Files to create

- `components/stitch/PersonaFilterChips.tsx`

## Files to modify

- `components/paper/PaperExplorePanel.tsx` — add `<PersonaFilterChips />` at the top

## Files to reference (read these first)

- `components/paper/PaperExplorePanel.tsx` — see the overall structure, what props it takes, and where to insert the chips row
- `components/stitch/ListDrawer.tsx` — look for the category filter chip rendering (around the `activeTypeFilters` usage, line ~1000+). This is the existing chip pattern to match visually.
- `lib/state/useSocialDiscoveryStore.ts` — `selectedPersonas`, `togglePersona`, `clearPersonas` (created in S4.1)
- `lib/social/extraction-contract.ts` — `PERSONA_VALUES` for the list of personas

## PersonaFilterChips component

```tsx
'use client'

import { useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'
import { PERSONA_VALUES, type Persona } from '@/lib/social/extraction-contract'

// Human-readable labels + emoji for each persona
const PERSONA_LABELS: Record<Persona, { label: string; emoji: string }> = {
  local:     { label: 'Local',     emoji: '🏘️' },
  luxury:    { label: 'Luxury',    emoji: '✨' },
  budget:    { label: 'Budget',    emoji: '💰' },
  design:    { label: 'Design',    emoji: '🎨' },
  foodie:    { label: 'Foodie',    emoji: '🍜' },
  adventure: { label: 'Adventure', emoji: '🧗' },
  family:    { label: 'Family',    emoji: '👨‍👩‍👧' },
  nightlife: { label: 'Nightlife', emoji: '🌙' },
}

export default function PersonaFilterChips() {
  const selectedPersonas = useSocialDiscoveryStore((s) => s.selectedPersonas)
  const togglePersona = useSocialDiscoveryStore((s) => s.togglePersona)
  const clearPersonas = useSocialDiscoveryStore((s) => s.clearPersonas)
  const socialPlaces = useSocialDiscoveryStore((s) => s.socialPlaces)

  // Only render if there are social places to filter
  if (socialPlaces.length === 0) return null

  return (
    <div className="border-b border-paper-tertiary-fixed px-3 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {/* "All" reset chip */}
        {selectedPersonas.size > 0 && (
          <button
            type="button"
            onClick={clearPersonas}
            className="shrink-0 rounded-full border border-paper-primary bg-paper-primary/10 px-2.5 py-1 text-xs font-medium text-paper-primary"
          >
            All ×
          </button>
        )}

        {PERSONA_VALUES.map((persona) => {
          const isActive = selectedPersonas.has(persona)
          const { label, emoji } = PERSONA_LABELS[persona]
          return (
            <button
              key={persona}
              type="button"
              onClick={() => togglePersona(persona)}
              className={[
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-paper-primary bg-paper-primary/10 text-paper-primary'
                  : 'border-paper-tertiary-fixed bg-paper-surface-container text-paper-secondary hover:border-paper-secondary',
              ].join(' ')}
            >
              {emoji} {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

## PaperExplorePanel change

In `components/paper/PaperExplorePanel.tsx`, add the chips row at the very top of the panel content, before the existing panel mode content (lists/details):

```tsx
import PersonaFilterChips from '@/components/stitch/PersonaFilterChips'

// Inside the render, at the top of the scrollable content area:
<PersonaFilterChips />
```

Read `PaperExplorePanel.tsx` carefully first to find the right insertion point — it should go above the `panelMode === 'lists'` / `panelMode === 'details'` branch, inside whatever scroll container wraps the panel body.

## What NOT to do

- Don't add persona labels or data to the store — they stay in the component constant
- Don't hide the chips row behind a feature flag or toggle — if `socialPlaces.length > 0` they show
- Don't add personas that aren't in `PERSONA_VALUES`
- Don't modify ListDrawer or any existing filter chip components

## Verification

1. Run the seed script from S3.3 so there are social places in the DB
2. Start dev server and open Explore mode
3. Persona chips row appears above the panel content
4. Clicking a chip highlights it and re-fetches with that persona filter
5. Clicking "All ×" clears filters
6. Multi-select works: clicking two chips shows places from either persona
