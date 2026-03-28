import { create } from 'zustand'

const STORAGE_KEY = 'acerca:onboarding'

type StoredState = {
  dismissedTips: string[]
  tipsDisabled: boolean
}

function readLocal(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dismissedTips: [], tipsDisabled: false }
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      dismissedTips: Array.isArray(parsed.dismissedTips) ? parsed.dismissedTips : [],
      tipsDisabled: typeof parsed.tipsDisabled === 'boolean' ? parsed.tipsDisabled : false,
    }
  } catch {
    return { dismissedTips: [], tipsDisabled: false }
  }
}

function writeLocal(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveToApi(state: StoredState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dismissed_tips: state.dismissedTips,
          tips_disabled: state.tipsDisabled,
        }),
      })
    } catch {
      // ignore — logged-out or offline
    }
  }, 500)
}

type OnboardingState = {
  dismissedTips: Set<string>
  tipsDisabled: boolean
  hydrated: boolean
  dismiss: (id: string) => void
  disableAll: () => void
  reset: () => void
  hydrate: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  dismissedTips: new Set<string>(),
  tipsDisabled: false,
  hydrated: false,

  dismiss: (id) => {
    const { dismissedTips, tipsDisabled } = get()
    if (dismissedTips.has(id)) return
    const next = new Set(dismissedTips)
    next.add(id)
    set({ dismissedTips: next })
    const stored = { dismissedTips: Array.from(next), tipsDisabled }
    writeLocal(stored)
    debouncedSaveToApi(stored)
  },

  disableAll: () => {
    const { dismissedTips } = get()
    set({ tipsDisabled: true })
    const stored = { dismissedTips: Array.from(dismissedTips), tipsDisabled: true }
    writeLocal(stored)
    debouncedSaveToApi(stored)
  },

  reset: () => {
    set({ dismissedTips: new Set(), tipsDisabled: false })
    const stored = { dismissedTips: [], tipsDisabled: false }
    writeLocal(stored)
    debouncedSaveToApi(stored)
  },

  hydrate: async () => {
    if (get().hydrated) return

    // Read localStorage first for instant feedback
    const local = readLocal()
    set({
      dismissedTips: new Set(local.dismissedTips),
      tipsDisabled: local.tipsDisabled,
    })

    // Then sync from server (authoritative)
    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const data = (await res.json()) as {
          dismissed_tips?: unknown
          tips_disabled?: unknown
        }
        const tips = Array.isArray(data.dismissed_tips) ? data.dismissed_tips : []
        const disabled =
          typeof data.tips_disabled === 'boolean' ? data.tips_disabled : false
        set({
          dismissedTips: new Set(tips as string[]),
          tipsDisabled: disabled,
        })
        writeLocal({ dismissedTips: tips as string[], tipsDisabled: disabled })
      }
    } catch {
      // offline — localStorage state is fine
    }

    set({ hydrated: true })
  },
}))
