# Social Discovery S5b — URL Ingest UI

## What to build

A URL paste input in the Explore panel that lets users add social content (YouTube videos, blog posts) directly from the map. User pastes a URL → system fetches transcript → extracts places → stores them → new social pins appear on the map.

**Flow:** URL input → `POST /api/enrichment/fetch-content` → `POST /api/enrichment/ingest-social` → call `fetchSocialPlaces()` → new pins on map.

**Depends on:** `social-s5-fetch-content.md` must be done first (fetch-content API endpoint must exist).

## Files to modify

- `components/stitch/PersonaFilterChips.tsx` (or a sibling file) — add `SocialUrlIngest` component below chips, or create as a separate file imported alongside chips
- `components/paper/PaperExplorePanel.tsx` — add `<SocialUrlIngest />` below `<PersonaFilterChips />`

## Files to create

- `components/stitch/SocialUrlIngest.tsx` — the URL input component

## Files to reference (read these first)

- `components/stitch/PersonaFilterChips.tsx` — pattern for social-related components in this panel
- `components/paper/PaperExplorePanel.tsx` — where PersonaFilterChips is rendered (lines ~322 and ~361); add SocialUrlIngest right below it in both desktop + mobile slots
- `lib/state/useSocialDiscoveryStore.ts` — import `fetchPlaces` action to trigger map refresh after ingest
- `lib/state/useDiscoveryStore.ts` — import `searchBias` for location_hint (has `{lat, lng, radiusMeters}`)
- `app/api/enrichment/fetch-content/route.ts` — the new endpoint shape (POST `{url}`)
- `app/api/enrichment/ingest-social/route.ts` — existing ingest endpoint (POST full request body)

---

## Implementation

### `components/stitch/SocialUrlIngest.tsx`

**States:** idle → loading (fetching/ingesting) → success → error

```tsx
'use client'

import { useState } from 'react'
import { useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

export function SocialUrlIngest() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fetchSocialPlaces = useSocialDiscoveryStore((s) => s.fetchPlaces)
  const searchBias = useDiscoveryStore((s) => s.searchBias)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus('loading')
    setMessage('')

    try {
      const ingestKey = process.env.NEXT_PUBLIC_SOCIAL_INGEST_KEY  // see note below
      const headers = {
        'Content-Type': 'application/json',
        'X-Ingest-Key': ingestKey ?? '',
      }

      // Step 1: fetch content
      const fetchRes = await fetch('/api/enrichment/fetch-content', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: trimmed }),
      })
      const fetchData = await fetchRes.json()
      if (!fetchRes.ok || fetchData.error) {
        throw new Error(fetchData.error ?? 'Failed to fetch content')
      }

      // Step 2: ingest
      const ingestBody = {
        url: fetchData.url,
        platform: fetchData.platform,
        author_name: fetchData.author_name,
        title: fetchData.title,
        transcript: fetchData.transcript,
        ...(searchBias
          ? { location_hint: { lat: searchBias.lat, lng: searchBias.lng } }
          : {}),
      }
      const ingestRes = await fetch('/api/enrichment/ingest-social', {
        method: 'POST',
        headers,
        body: JSON.stringify(ingestBody),
      })
      const ingestData = await ingestRes.json()
      if (!ingestRes.ok || ingestData.error) {
        throw new Error(ingestData.error ?? 'Ingest failed')
      }

      // Step 3: refresh map
      await fetchSocialPlaces()

      setStatus('success')
      setMessage(`${ingestData.places_resolved} place${ingestData.places_resolved !== 1 ? 's' : ''} added`)
      setUrl('')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <div className="mb-3 mt-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          placeholder="Paste YouTube or blog URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === 'loading'}
          className="min-w-0 flex-1 rounded border border-paper-tertiary-fixed bg-paper-surface-warm px-3 py-1.5 text-sm placeholder:text-paper-on-surface-variant focus:outline-none focus:ring-1 focus:ring-paper-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!url.trim() || status === 'loading'}
          className="shrink-0 rounded bg-paper-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {status === 'loading' ? '…' : 'Add'}
        </button>
      </form>
      {status === 'success' && (
        <p className="mt-1 text-xs text-green-700">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-1 text-xs text-red-600">{message}</p>
      )}
    </div>
  )
}
```

**Note on `NEXT_PUBLIC_SOCIAL_INGEST_KEY`:** The ingest key needs to be available client-side for this flow. Add it to `.env.example` as `NEXT_PUBLIC_SOCIAL_INGEST_KEY=` (same value as `SOCIAL_INGEST_KEY`). This is intentional — the fetch-content + ingest-social endpoints are the auth boundary; the key rate-limits the pipeline, not a security gate.

### `components/paper/PaperExplorePanel.tsx`

Import `SocialUrlIngest` and add it right below `<PersonaFilterChips />` in both the desktop and mobile slots:

```tsx
import { SocialUrlIngest } from '@/components/stitch/SocialUrlIngest'

// In both desktop and mobile content areas:
<PersonaFilterChips />
<SocialUrlIngest />
{children}
```

### `.env.example`

Add:
```
NEXT_PUBLIC_SOCIAL_INGEST_KEY=   # Client-accessible ingest key (same value as SOCIAL_INGEST_KEY)
```

---

## What NOT to do

- Don't add drag-and-drop or batch URL processing — single URL only
- Don't show a full modal or drawer — inline input is sufficient
- Don't store ingest history in state — the map refresh is enough feedback
- Don't disable the form after success — allow immediate re-use
- Don't add `platform_not_supported` special handling — the generic error message is fine for v1

## Error messages to show (user-facing)

| Error from API | Display |
|----------------|---------|
| `platform_not_supported` | "Only YouTube and blog URLs are supported" |
| `no_transcript` | "No transcript found — try a video with captions" |
| `fetch_failed` | "Couldn't fetch that URL" |
| Other | "Something went wrong" |

Map the errors in the catch block before setting message.

## Verification

Manual test (no automated test needed for this UI slice):

1. Paste a YouTube URL with captions → "X places added" appears, new pins on map
2. Paste a blog URL with travel content → places added
3. Paste a TikTok URL → "Only YouTube and blog URLs are supported"
4. Paste a broken URL → error state shown, form resets after 5s
5. On mobile bottom sheet at half/full snap — input is visible and functional

Run `npm run check` before committing.
