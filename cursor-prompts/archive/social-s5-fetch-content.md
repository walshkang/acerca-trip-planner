# Social Discovery S5a — Content Fetch Lib + API

## What to build

A server-side content fetching layer that accepts a URL and returns extracted transcript/text + metadata. This is the missing upstream step before `ingest-social` — currently callers must supply the transcript manually.

**Supported platforms for v1:**
- **YouTube** — extract transcript via timed captions + channel name via oEmbed
- **Blog/article** — fetch HTML, extract body text from `<article>` or `<main>` or `<body>`, strip scripts/styles/nav

**Not in scope:** TikTok, Instagram, Reddit. Accept the URL but return a `platform_not_supported` error.

## Packages to install

```bash
npm install youtube-transcript node-html-parser
```

- `youtube-transcript` — fetches YouTube auto-captions without an API key
- `node-html-parser` — lightweight HTML parser (no DOM required), server-side only

## Files to create

- `lib/server/social/fetch-content.ts` — platform detection + adapter logic (pure functions, testable)
- `app/api/enrichment/fetch-content/route.ts` — POST endpoint

## Files to reference (read these first)

- `app/api/enrichment/ingest-social/route.ts` — auth pattern to copy (X-Ingest-Key check)
- `lib/social/extraction-contract.ts` — `platform` values: `'tiktok' | 'youtube' | 'blog' | 'instagram' | 'reddit' | 'other'`
- `lib/server/social/ingest.ts` — the downstream consumer of this output

---

## Implementation

### 1. `lib/server/social/fetch-content.ts`

```typescript
export type FetchedContent = {
  url: string
  platform: 'youtube' | 'blog' | 'other'
  author_name: string
  title: string
  transcript: string
}

export type FetchContentError = {
  error: string // 'platform_not_supported' | 'fetch_failed' | 'no_transcript'
}

export type FetchContentResult = FetchedContent | FetchContentError
```

**Platform detection:**

```typescript
function detectPlatform(url: string): 'youtube' | 'blog' | 'unsupported' {
  const u = new URL(url)
  if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) return 'youtube'
  if (u.hostname.includes('tiktok.com') || u.hostname.includes('instagram.com')) return 'unsupported'
  return 'blog'
}
```

**YouTube adapter:**

```typescript
import { YoutubeTranscript } from 'youtube-transcript'

async function fetchYouTube(url: string): Promise<FetchedContent> {
  // 1. Fetch oEmbed metadata (no API key needed)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const meta = await fetch(oembedUrl).then(r => r.json()).catch(() => null)
  const title: string = meta?.title ?? 'YouTube Video'
  const author_name: string = meta?.author_name ?? 'Unknown'

  // 2. Fetch transcript segments
  const segments = await YoutubeTranscript.fetchTranscript(url)
  if (!segments?.length) throw new Error('no_transcript')

  const transcript = segments.map(s => s.text).join(' ')
  return { url, platform: 'youtube', author_name, title, transcript }
}
```

**Blog adapter:**

```typescript
import { parse } from 'node-html-parser'

async function fetchBlog(url: string): Promise<FetchedContent> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Acerca-Bot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`fetch_failed:${response.status}`)

  const html = await response.text()
  const root = parse(html)

  // Extract title
  const title =
    root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    root.querySelector('title')?.text ||
    new URL(url).hostname

  // Extract author
  const author_name =
    root.querySelector('meta[name="author"]')?.getAttribute('content') ||
    root.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
    new URL(url).hostname

  // Remove non-content tags
  root.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove())

  // Extract text from content area, falling back to body
  const contentEl =
    root.querySelector('article') ||
    root.querySelector('main') ||
    root.querySelector('[role="main"]') ||
    root.querySelector('body')

  const transcript = (contentEl?.text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50_000) // cap at 50k chars — enough for any blog post

  if (!transcript) throw new Error('no_transcript')
  return { url, platform: 'blog', author_name: author_name.trim(), title: title.trim(), transcript }
}
```

**Main export:**

```typescript
export async function fetchContent(url: string): Promise<FetchContentResult> {
  try {
    new URL(url) // validate
  } catch {
    return { error: 'invalid_url' }
  }

  const platform = detectPlatform(url)
  if (platform === 'unsupported') return { error: 'platform_not_supported' }

  try {
    if (platform === 'youtube') return await fetchYouTube(url)
    return await fetchBlog(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch_failed'
    return { error: msg }
  }
}
```

---

### 2. `app/api/enrichment/fetch-content/route.ts`

Same auth pattern as `ingest-social` (X-Ingest-Key header).

**Request:** `POST { url: string }`

**Response (success):**
```json
{
  "url": "...",
  "platform": "youtube",
  "author_name": "...",
  "title": "...",
  "transcript": "..."
}
```

**Response (error):** `{ "error": "platform_not_supported" }` with appropriate status code:
- `400` for invalid_url, platform_not_supported
- `502` for fetch_failed, no_transcript

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { fetchContent } from '@/lib/server/social/fetch-content'

export async function POST(request: NextRequest) {
  const ingestKey = process.env.SOCIAL_INGEST_KEY
  if (!ingestKey || request.headers.get('X-Ingest-Key') !== ingestKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const result = await fetchContent(url)

  if ('error' in result) {
    const status = ['invalid_url', 'platform_not_supported'].includes(result.error) ? 400 : 502
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
```

---

## What NOT to do

- Don't attempt TikTok or Instagram transcript fetching — `platform_not_supported` is the correct v1 response
- Don't add a YouTube Data API key — oEmbed is free, no key required
- Don't add retry logic — let callers handle retries
- Don't add UI — this is a server-only slice
- Don't add rate limiting in this slice

## Verification

Write tests in `lib/server/social/__tests__/fetch-content.test.ts`:

1. **YouTube** — mock `YoutubeTranscript.fetchTranscript` and `global.fetch` (for oEmbed). Verify `platform: 'youtube'`, `author_name`, `title`, joined `transcript`.
2. **Blog** — mock `global.fetch` returning HTML with an `<article>` tag. Verify text extraction strips `<script>` and `<nav>`, and transcript is non-empty.
3. **platform_not_supported** — TikTok URL → `{ error: 'platform_not_supported' }`
4. **no_transcript** — YouTube fetch returns empty segments → `{ error: 'no_transcript' }`
5. **invalid_url** — `"not-a-url"` → `{ error: 'invalid_url' }`

Run `npm test` to confirm all pass.
