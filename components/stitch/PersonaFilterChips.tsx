'use client'

import { useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'
import { PERSONA_VALUES, type Persona } from '@/lib/social/extraction-contract'
import { shouldShowPersonaFilterChips } from '@/lib/social/ui-state'

const PERSONA_LABELS: Record<Persona, { label: string; emoji: string }> = {
  local: { label: 'Local', emoji: '🏘️' },
  luxury: { label: 'Luxury', emoji: '✨' },
  budget: { label: 'Budget', emoji: '💰' },
  design: { label: 'Design', emoji: '🎨' },
  foodie: { label: 'Foodie', emoji: '🍜' },
  adventure: { label: 'Adventure', emoji: '🧗' },
  family: { label: 'Family', emoji: '👨‍👩‍👧' },
  nightlife: { label: 'Nightlife', emoji: '🌙' },
}

export default function PersonaFilterChips() {
  const selectedPersonas = useSocialDiscoveryStore((state) => state.selectedPersonas)
  const togglePersona = useSocialDiscoveryStore((state) => state.togglePersona)
  const clearPersonas = useSocialDiscoveryStore((state) => state.clearPersonas)
  const socialPlaces = useSocialDiscoveryStore((state) => state.socialPlaces)
  const isLoading = useSocialDiscoveryStore((state) => state.isLoading)
  const error = useSocialDiscoveryStore((state) => state.error)

  if (
    !shouldShowPersonaFilterChips({
      socialPlaceCount: socialPlaces.length,
      selectedPersonaCount: selectedPersonas.size,
      isLoading,
      error,
    })
  ) {
    return null
  }

  return (
    <div className="border-b border-paper-tertiary-fixed px-3 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {selectedPersonas.size > 0 ? (
          <button
            type="button"
            onClick={clearPersonas}
            className="shrink-0 rounded-full border border-paper-primary bg-paper-primary/10 px-2.5 py-1 text-xs font-medium text-paper-primary"
          >
            All ×
          </button>
        ) : null}

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
