# N5b — Video thumbnails on source entries

## Goal

Show a YouTube thumbnail for each source in `SourcesPanel`. One video maps to many place cards, so the thumbnail belongs on the **source entry** (below the dropdown), not repeated on every place card.

**Model: Sonnet** — small, mechanical: extract video ID from URL, render thumbnail.

---

## Step 1: YouTube video ID extraction utility

### `lib/social/youtube.ts` (new file)

```ts
/**
 * Extracts a YouTube video ID from common URL formats.
 * Returns null for non-YouTube URLs or unrecognized formats.
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    if (host === 'youtube.com') {
      // /watch?v=ID
      const v = parsed.searchParams.get('v')
      if (v) return v

      // /shorts/ID or /embed/ID or /v/ID
      const match = parsed.pathname.match(/\/(?:shorts|embed|v)\/([^/?#]+)/)
      if (match?.[1]) return match[1]
    }

    return null
  } catch {
    return null
  }
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
```

---

## Step 2: Render in SourcesPanel

### `components/stitch/SourcesPanel.tsx`

Import the new helpers:

```ts
import { extractYouTubeVideoId, youTubeThumbnailUrl } from '@/lib/social/youtube'
```

The current selected-source metadata block (lines 333–341) is:

```tsx
{selectedSource ? (
  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-paper-on-surface-variant">
    <span className="paper-chip py-0.5">
      {platformChipLabel(selectedSource.platform)}
    </span>
    <span>@{selectedSource.author_name}</span>
    <span className="capitalize">{selectedSource.author_persona}</span>
  </div>
) : null}
```

Replace with:

```tsx
{selectedSource ? (
  <div className="mt-1 space-y-2">
    <div className="flex flex-wrap items-center gap-2 text-xs text-paper-on-surface-variant">
      <span className="paper-chip py-0.5">
        {platformChipLabel(selectedSource.platform)}
      </span>
      <span>@{selectedSource.author_name}</span>
      <span className="capitalize">{selectedSource.author_persona}</span>
    </div>
    {(() => {
      const videoId = extractYouTubeVideoId(selectedSource.url)
      if (!videoId) return null
      return (
        <a
          href={selectedSource.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-3 rounded border border-paper-tertiary-fixed bg-paper-surface-container p-2 transition-colors hover:bg-paper-surface-container-high"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youTubeThumbnailUrl(videoId)}
            alt={selectedSource.title ?? 'YouTube video'}
            className="h-[54px] w-24 shrink-0 rounded object-cover bg-paper-surface-container"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            {selectedSource.title ? (
              <p className="line-clamp-2 text-xs font-medium text-paper-on-surface">
                {selectedSource.title}
              </p>
            ) : null}
            <p className="mt-0.5 text-[11px] text-paper-on-surface-variant">
              {platformChipLabel(selectedSource.platform)} · @{selectedSource.author_name}
            </p>
          </div>
        </a>
      )
    })()}
  </div>
) : null}
```

Key choices:
- Wrapped in `<a>` linking to the source URL — clicking opens the original video (useful for research)
- Compact card treatment with border + bg, matching existing panel styling
- `h-[54px] w-24` keeps 16:9 ratio at small size; `object-cover` handles thumbnail aspect ratio
- `eslint-disable @next/next/no-img-element` — external URL, can't use `next/image`
- Non-YouTube sources: the IIFE returns `null`, only the existing chip/author row renders

---

## Verification

1. Open Sources mode → select a YouTube source → thumbnail card appears below the dropdown with title and "YOUTUBE · @author" subtitle
2. Click the thumbnail card → opens the YouTube video in a new tab
3. Switch to a blog/non-YouTube source → no thumbnail card, just the existing chip row
4. Select a YouTube source with a long title → title line-clamps at 2 lines
5. Thumbnail loads lazily (check network tab — no eager preload)

---

## Files to touch

- `lib/social/youtube.ts` — new utility (video ID extraction + thumbnail URL)
- `components/stitch/SourcesPanel.tsx` — render thumbnail card below source dropdown

## Do NOT touch

- `SourcePlaceCard` — thumbnail is per-source, not per-place
- `SourcesShellPaper.tsx` — layout changes are N5c
- `user-sources-contract.ts` — no new data needed; thumbnail is derived from existing `url` field
