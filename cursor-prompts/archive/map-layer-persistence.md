# Map Layer Preference — Per-User Persistence

## What to build

Persist the user's map layer choice (default/satellite/terrain) across sessions. Logged-in users save to Supabase; logged-out users fall back to localStorage.

## Prerequisites

- The `useMapLayerStore` from the map-layer-toggle slice must exist
- The Supabase migration for `user_preferences` must be applied (created separately via Claude Code)

## Files to modify

- `lib/state/useMapLayerStore.ts` — add hydration from API + localStorage fallback, debounced save on change

## Files to create

- `app/api/user/preferences/route.ts` — GET/PUT endpoint for user preferences

## Files to reference

- `lib/supabase/client.ts` or wherever the Supabase client is created — for auth session access
- `components/map/MapShell.tsx` — to understand how auth state is checked
- The migration file that creates `user_preferences` (will be in `supabase/migrations/`)

## Implementation steps

### 1. Create the API route

**File:** `app/api/user/preferences/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_preferences')
    .select('map_layer')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ map_layer: data?.map_layer ?? 'default' })
}

export async function PUT(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const map_layer = body.map_layer
  if (!['default', 'satellite', 'terrain'].includes(map_layer)) {
    return NextResponse.json({ error: 'Invalid layer' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, map_layer }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

Adapt this to match whatever Supabase client pattern the project uses (check `lib/supabase/client.ts` and existing API routes).

### 2. Add hydration + debounced save to the store

**File:** `lib/state/useMapLayerStore.ts`

Add a `hydrate` action and a `persist` side-effect:

```typescript
import { create } from 'zustand'

export type MapLayer = 'default' | 'satellite' | 'terrain'

const STORAGE_KEY = 'acerca:mapLayer'

type MapLayerState = {
  activeLayer: MapLayer
  hydrated: boolean
  setLayer: (layer: MapLayer) => void
  hydrate: () => Promise<void>
}

export const useMapLayerStore = create<MapLayerState>((set, get) => ({
  activeLayer: 'default',
  hydrated: false,

  setLayer: (layer) => {
    set({ activeLayer: layer })
    // Save to localStorage immediately
    try { localStorage.setItem(STORAGE_KEY, layer) } catch {}
    // Debounced save to API
    debouncedSaveToApi(layer)
  },

  hydrate: async () => {
    if (get().hydrated) return
    // 1. Try localStorage first (instant)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as MapLayer | null
      if (stored && ['default', 'satellite', 'terrain'].includes(stored)) {
        set({ activeLayer: stored })
      }
    } catch {}
    // 2. Try API (authoritative, overrides localStorage)
    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const { map_layer } = await res.json()
        if (map_layer && ['default', 'satellite', 'terrain'].includes(map_layer)) {
          set({ activeLayer: map_layer })
          try { localStorage.setItem(STORAGE_KEY, map_layer) } catch {}
        }
      }
    } catch {}
    set({ hydrated: true })
  },
}))

// Debounce API saves (500ms)
let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveToApi(layer: MapLayer) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_layer: layer }),
      })
    } catch {}
  }, 500)
}
```

### 3. Call hydrate on app mount

In a top-level layout or the component that mounts MapShell (likely `ExploreShellPaper.tsx`), call hydrate once:

```typescript
const hydrate = useMapLayerStore((s) => s.hydrate)
useEffect(() => { hydrate() }, [hydrate])
```

## What NOT to do

- Don't block map rendering on hydration — show default layer immediately, update when preference loads
- Don't save on every render — only on explicit `setLayer` calls
- Don't fail loudly if the API is unreachable — localStorage is the fallback
