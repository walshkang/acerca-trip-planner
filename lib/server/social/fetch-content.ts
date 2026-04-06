import { parse } from 'node-html-parser'
import { YoutubeTranscript } from 'youtube-transcript'

export type FetchedContent = {
  url: string
  platform: 'youtube' | 'blog' | 'other'
  author_name: string
  title: string
  transcript: string
}

export type FetchContentError = {
  error:
    | 'invalid_url'
    | 'platform_not_supported'
    | 'no_transcript'
    | 'fetch_failed'
}

export type FetchContentResult = FetchedContent | FetchContentError

function detectPlatform(url: string): 'youtube' | 'blog' | 'unsupported' {
  const u = new URL(url)
  const host = u.hostname.toLowerCase()

  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return 'youtube'
  }

  const unsupportedDomains = ['tiktok.com', 'instagram.com', 'reddit.com']
  for (const domain of unsupportedDomains) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return 'unsupported'
    }
  }

  return 'blog'
}

function mapCaughtError(err: unknown): FetchContentError {
  if (err instanceof Error) {
    if (err.message === 'no_transcript') return { error: 'no_transcript' }
    if (err.message.startsWith('fetch_failed')) return { error: 'fetch_failed' }
  }
  return { error: 'fetch_failed' }
}

async function fetchYouTubeOembed(url: string): Promise<{ title: string; author_name: string }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new Error('fetch_failed')
  const meta = (await res.json().catch(() => null)) as {
    title?: string
    author_name?: string
  } | null
  return {
    title: typeof meta?.title === 'string' ? meta.title : 'YouTube Video',
    author_name: typeof meta?.author_name === 'string' ? meta.author_name : 'Unknown',
  }
}

async function fetchYouTube(url: string): Promise<FetchedContent> {
  const [{ title, author_name }, segments] = await Promise.all([
    fetchYouTubeOembed(url),
    YoutubeTranscript.fetchTranscript(url),
  ])

  if (!segments?.length) throw new Error('no_transcript')

  const transcript = segments.map((s) => s.text).join(' ')
  if (!transcript.trim()) throw new Error('no_transcript')

  return { url, platform: 'youtube', author_name, title, transcript }
}

async function fetchBlog(url: string): Promise<FetchedContent> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Acerca-Bot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`fetch_failed:${response.status}`)

  const html = await response.text()
  const root = parse(html)

  const title =
    root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    root.querySelector('title')?.text ||
    new URL(url).hostname

  const author_name =
    root.querySelector('meta[name="author"]')?.getAttribute('content') ||
    root.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
    new URL(url).hostname

  root.querySelectorAll('script, style, nav, header, footer, aside').forEach((el) => el.remove())

  const contentEl =
    root.querySelector('article') ||
    root.querySelector('main') ||
    root.querySelector('[role="main"]') ||
    root.querySelector('body')

  const transcript = (contentEl?.text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50_000)

  if (!transcript) throw new Error('no_transcript')

  return {
    url,
    platform: 'blog',
    author_name: author_name.trim(),
    title: title.trim(),
    transcript,
  }
}

export async function fetchContent(url: string): Promise<FetchContentResult> {
  try {
    new URL(url)
  } catch {
    return { error: 'invalid_url' }
  }

  const platform = detectPlatform(url)
  if (platform === 'unsupported') {
    return { error: 'platform_not_supported' }
  }

  try {
    if (platform === 'youtube') return await fetchYouTube(url)
    return await fetchBlog(url)
  } catch (err) {
    return mapCaughtError(err)
  }
}
