import { create } from 'zustand'

export type JourneyMode = 'explore' | 'plan' | 'sources'

type NavState = {
  mode: JourneyMode
  setMode: (mode: JourneyMode) => void
}

function readInitialMode(): JourneyMode {
  if (typeof window === 'undefined') return 'explore'
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('mode')
  if (raw === 'plan') return 'plan'
  if (raw === 'sources') return 'sources'
  return 'explore'
}

export const useNavStore = create<NavState>((set) => ({
  mode: readInitialMode(),

  setMode: (mode) => {
    set({ mode })

    // Sync URL param
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (mode === 'explore') {
      url.searchParams.delete('mode')
    } else {
      url.searchParams.set('mode', mode)
    }
    window.history.pushState({}, '', url.toString())
  },
}))
